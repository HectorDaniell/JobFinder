# ADR-0028 — `Experience` como contenedor genérico, y cobertura garantizada por contenedor

**Estado:** Aceptado · **Fecha:** 2026-08-08

## Contexto

Al revisar un CV generado con datos reales, apareció el mismo problema por dos
caminos distintos:

**El síntoma inmediato.** Un empleo (TAC Digital) salía en el CV con
encabezado y fechas, pero sin ninguna línea debajo, porque el LLM no
seleccionó ningún bullet suyo para esa vacante en concreto (ADR-0026 ya
garantizaba que el empleo no desapareciera; no garantizaba que dijera algo).

**La pregunta de fondo, que el usuario planteó directamente:** *"si le doy a
`Experience` su propia descripción para tapar ese hueco, ¿para qué sirven ya
los bullets? Y si los bullets siguen siendo lo que se adapta, ¿en qué se
diferencia esto de LinkedIn?"*

Ese razonamiento es correcto y no se resuelve parcheando el síntoma. Añadir
`Experience.description` como texto estático crea un CV con dos fuentes de
contenido —una fija, una adaptable— que dicen cosas distintas según la
vacante, y la descripción estática nunca pasa por el LLM ni por el
anti-invención. Es un atajo que rompe la garantía central del producto
(RF-17).

**El diagnóstico real** no era el modelo de datos: era la **política de
selección**. Al LLM se le pedía "elige los bullets más relevantes para esta
vacante", y esa pregunta no es la misma que "arma el mejor CV para esta
vacante". Un CV real nunca omite un trabajo ni lo deja en blanco — dice
*menos* de lo menos relevante, nunca nada. Eso es una regla de composición
que falta en el sistema, no un campo que falta en el modelo.

**Un segundo problema, estructural, salió a la luz al perseguir el primero.**
Proyectos y educación no eran contenedores reales: eran bullets sueltos
agrupados por `sourceRole`, un campo de texto libre. Por eso el proyecto
personal del usuario aparecía titulado *"Fullstack Development - Proyecto
Personal - JobFinder"* en vez de tener un nombre y una fecha como cualquier
entrada de un CV. `sourceRole` estaba haciendo, mal, el trabajo de una entidad.

## Decisión

### 1. `Experience` pasa a ser un contenedor genérico con `kind`

`kind: 'job' | 'project' | 'education'`. Los campos `organization`/`title` se
**reinterpretan** según el tipo (empresa/rol, contexto/nombre de proyecto,
institución/título obtenido) en vez de añadir columnas específicas por tipo:
los tres representan lo mismo —un periodo de la trayectoria del candidato,
con un título y una organización— y esa es la propiedad que se quiere
compartir en el código, no fragmentar.

`kind` es **inmutable** tras crear el contenedor: cambiar de tipo no es una
edición, es borrar y crear otro.

### 2. Todo bullet pertenece a un contenedor — obligatorio

`Bullet.experienceId` deja de ser opcional. Ya no existe el bullet "suelto".
`sourceRole` desaparece: era el apaño que este cambio vuelve innecesario.

`BulletCategory` se reduce a `'experience' | 'achievement'` — una distinción
editorial (tarea del día a día vs. logro destacado), independiente de DÓNDE
vive el bullet. Esa pregunta ahora la responde el `kind` del contenedor, y
mantenerla también en `category` solo permitía estados inconsistentes (un
bullet `category: 'project'` colgado de un contenedor `kind: 'job'`).

### 3. Cobertura garantizada — el LLM propone, el sistema verifica

`TailorDocuments` ya no solo fuerza que la educación esté presente
(ADR-0026): generaliza esa regla a **todos** los contenedores. Por cada uno
que quede sin ningún bullet seleccionado, se añade determinísticamente el
mejor bullet real del banco (por solapamiento de skills con la vacante) —
nunca por el LLM, para no gastar otra llamada ni abrir otra vía de invención.
Sigue siendo un bullet REAL: la garantía de "nunca inventa" no se toca.

Esto reemplaza `withEducation` por `withGuaranteedCoverage`, que cubre
empleos, proyectos y educación con el mismo mecanismo. ADR-0026 queda como el
caso particular que motivó la regla; esta ADR es la generalización.

En paralelo, el prompt (v1.2) agrupa el banco por contenedor (`[Group N]`) y
pide explícitamente que la selección represente TODA la trayectoria, no solo
el rol más reciente — para que el sistema necesite recurrir a la cobertura
garantizada lo menos posible, no como sustituto de ella.

### Dónde queda la diferencia con un perfil de LinkedIn

En que el banco es un **superconjunto** deliberado: más evidencia de la que
cabe en un CV. El LLM selecciona qué subconjunto argumenta mejor para cada
vacante y lo reformula sin inventar; el sistema garantiza que ningún periodo
de la trayectoria quede en blanco. Dos vacantes distintas producen dos CV
distintos del mismo material — eso no lo hace un formulario que solo se
rellena una vez.

## Alternativas descartadas

- **`Experience.description` como texto estático.** Crea contenido que no pasa
  por el LLM ni por el anti-invención, y vuelve la pregunta "¿para qué sirven
  los bullets?" sin respuesta — exactamente lo que el usuario señaló.
- **Tres tablas separadas (`job`, `project`, `education`).** Job/project/
  education comparten CADA propiedad relevante (título, organización, fechas,
  bullets agrupados debajo); tres tablas habrían triplicado el repositorio, el
  schema y la lógica de agrupación del CV para una diferencia que es solo de
  etiqueta.
- **Rellenar los contenedores vacíos con un bullet genérico inventado.**
  Rompe RF-17 directamente.
- **Pedirle al LLM que cubra todos los contenedores.** No hay garantía de que
  obedezca, y fuerza bullets irrelevantes para la vacante con tal de "no dejar
  nada en blanco" — el resultado sería peor, no mejor.
- **Mantener `category` con las 4 variantes (incluyendo `project`/`education`)
  además del nuevo `kind`.** Dos campos afirmando lo mismo, con la posibilidad
  de que se contradigan.

## Consecuencias

**A favor**

- El CV nunca tiene un contenedor mudo ni un hueco de fechas sin explicar,
  para NINGÚN tipo de entrada — no solo empleos y educación.
- Proyectos y educación son contenedores reales: nombre, organización y
  fechas propias, agrupados por el mismo mecanismo que los empleos.
- La garantía de cero invención se mantiene intacta: la cobertura solo añade
  bullets reales del banco, nunca genera texto.
- Sin llamadas adicionales a Claude: la cobertura es un bucle en memoria sobre
  el banco ya cargado.

**En contra**

- **Migración de datos no trivial.** Los bullets huérfanos existentes (sin
  `experienceId`) se agruparon por su `sourceRole` en nuevos contenedores
  automáticos, con `organization`/`title` provisionales (el propio texto de
  `sourceRole`) y `startDate` aproximada (el `created_at` más antiguo del
  grupo, única fecha disponible). Esos contenedores necesitan **edición manual
  del usuario** para tener título y fechas reales — no es un dato inventado
  por el sistema, es un placeholder explícito hasta que el usuario lo corrija.
- **Bullet.experienceId obligatorio implica que borrar un contenedor borra en
  cascada sus bullets** (antes quedaban huérfanos con `SET NULL`). Es la única
  opción consistente con "todo bullet pertenece a un contenedor", pero cambia
  el radio de una acción de borrado — mitigado con aviso explícito en la UI.
- El banco de bullets exige más disciplina del usuario: cada logro nuevo
  necesita tener su contenedor creado de antemano. La UI ahora bloquea la
  creación de un bullet si no hay ningún contenedor todavía, en vez de
  permitir un bullet "suelto" como antes.
