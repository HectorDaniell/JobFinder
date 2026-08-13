# ADR-0029 — Ingesta en dos tiempos: descubrir y enriquecer

**Estado:** Aceptado · **Fecha:** 2026-08-08

## Contexto

Al empezar a diseñar la Fase 2 (ingesta), revisar el Gmail real del usuario
destapó un supuesto roto en el plan original.

**El supuesto.** RF-06 decía que el sistema extrae de los correos *"título,
empresa, enlace, **descripción**"*. Esa última palabra no se sostiene.

**Lo que hay de verdad.** Los correos de LinkedIn, Glassdoor y Computrabajo no
son vacantes: son **notificaciones**. Traen una tarjeta con título, empresa,
ubicación y, a veces, salario — más una URL de seguimiento. La descripción
completa vive detrás de esa URL, en la UI de la plataforma, tras un login. Y en
LinkedIn/Glassdoor el botón "Postular" muchas veces **redirige a un tercer
sitio**, que es donde de verdad están el formulario y la carga del CV.

**Las puertas que además están cerradas** (verificado en agosto de 2026):

- **LinkedIn** no expone API pública de *búsqueda* de vacantes. Su Job Posting
  API es para *publicar*, es partner-only, y los casos de uso de extracción de
  datos se rechazan explícitamente.
- **Glassdoor** cerró su API para desarrolladores; no emite claves nuevas desde
  ~2022 y desde 2024 está restringida a contratos enterprise.

Y el PRD (§5, D2) ya prohíbe el scraping de esas plataformas — no por falta de
medios, sino por decisión de producto: cero riesgo de baneo de las cuentas del
usuario.

**El diagnóstico.** El problema no es de dónde vienen las vacantes. Es que la
ingesta estaba tratando como **un solo paso** dos trabajos con propiedades
opuestas:

| | Qué resuelve | ¿Sirve el correo? |
|---|---|---|
| **Descubrimiento** | saber que la vacante existe | ✅ excelente |
| **Enriquecimiento** | obtener el JD completo | ❌ inútil |

El correo, lejos de ser un problema, es el **mejor activo de descubrimiento que
tiene el producto**: LinkedIn y Glassdoor ya corren su propio matching contra el
perfil del usuario, con su CV cargado y su historial. Esa personalización es
gratuita y es mejor que cualquier búsqueda por parámetros (`?q=backend`) que el
sistema pudiera armar. Lo que el correo no puede dar es el texto.

## Decisión

### 1. La ingesta se parte en dos etapas con puertos distintos

**Descubrimiento** produce vacantes *delgadas* (título, empresa, ubicación, URL,
sin descripción). **Enriquecimiento** las completa. Son dos puertos separados en
`core`: `JobSourcePort` / `EmailReaderPort` para lo primero, y un
`JobEnricherPort` nuevo para lo segundo.

Como consecuencia, `Job.description` pasa a ser **nullable** y aparece un
`Job.enrichmentStatus` (`thin | enriched | unavailable`). Una vacante delgada es
un estado legítimo del sistema, no un error.

### 2. Las fuentes son de tres tipos, y no son intercambiables

Confundirlos fue parte del error original. Se distinguen por dos preguntas:
*¿puedo buscar en ella?* y *¿me da el JD completo?*

| Tipo | Ejemplos | ¿Buscar? | ¿JD completo? | Rol |
|---|---|---|---|---|
| **ATS pública** | Greenhouse, Lever, Ashby, Workable, Recruitee, Personio | ❌ hace falta el `board_token` de la empresa | ✅ | **Enriquecer** |
| **Bolsa con API** | Remotive, Himalayas, Arbeitnow, Jobicy, RemoteOK, Get on Board | ✅ | ✅ | **Descubrir** (ya enriquecida) |
| **Agregador** | Adzuna | ✅ | ❌ truncado a propósito | **Descubrir** |

Una ATS **no se puede buscar**: no existe "dame todas las vacantes de
Greenhouse". Solo responde si ya sabes por qué empresa preguntas. Por eso nunca
es fuente de descubrimiento. Adzuna trunca la descripción por modelo de negocio
(quiere el clic), así que nunca es fuente de enriquecimiento.

### 3. El enriquecimiento va DENTRO del embudo, después de la Capa 1

Este es el cambio que decide el costo. La Capa 1 (reglas: ubicación, modalidad,
seniority, salario, deal-breakers) **funciona perfectamente con los metadatos
delgados** que el correo sí trae. No necesita el JD.

```
Correos + APIs  →  cientos de vacantes delgadas
      ↓  Capa 0 · DEDUP
      ↓  Capa 1 · REGLAS          (coste 0, solo metadatos)
   ~decenas
      ↓  ENRICHMENT ← aquí, no antes
      ↓  Capa 2 · EMBEDDINGS
      ↓  Capa 3 · LLM SCORING
      ↓  Capa 4 · TAILORING
```

Enriquecer una vacante que se iba a descartar de todos modos es trabajo tirado.
Enriquecer solo las decenas que sobreviven a la Capa 1 es la diferencia entre
cientos de peticiones y unas pocas.

### 4. El enriquecimiento es una cascada que degrada, no un método único

Por orden, hasta que uno responda:

1. **¿Ya venía completa?** (bolsa con API) → listo, coste cero.
2. **ATS pública de la empresa** (JSON, sin auth, descripción completa). 🟢
3. **Página de empleo de la propia empresa**, leyendo su `JobPosting` en
   **JSON-LD**. 🟡
4. **Captura asistida** — el usuario la trae. 🟢

**Sobre el paso 2, honestamente:** la propuesta inicial afirmó que una vacante
vista en LinkedIn *"casi con certeza"* vive también en una ATS pública. **Eso
está sobreafirmado y se retira.** El mecanismo real es que muchas vacantes
*nacen* en la ATS y de ahí se **sindican** a LinkedIn — por eso "Postular en el
sitio web de la empresa" suele terminar en la ATS de origen. Pero falla en tres
casos frecuentes: LinkedIn *Easy Apply* (publicada desde la UI de LinkedIn,
puede no existir en otro lado), empresas con otra ATS (Workday, SuccessFactors,
Taleo — enormes y sin API pública amigable), y sesgo geográfico (las seis con
API pública escoran hacia startups tech de EE.UU./Europa; en LATAM abundan
Workday y sistemas propios).

**Por eso la tasa de acierto se mide, no se supone.** Se instrumenta qué paso de
la cascada resolvió cada vacante. A las pocas semanas hay un número real *para
la búsqueda concreta de este usuario*. El diseño no depende de acertar ese
número de antemano: si es bajo, el paso 4 sostiene el producto; si es alto, se
ahorra trabajo.

**Y el sistema aprende.** Al descubrir que una empresa usa Lever con el token
`x`, se cachea (`company_ats`), y **todas sus vacantes futuras se enriquecen
gratis**. El universo de empresas objetivo de un usuario son decenas, no
millones. Además, si la captura del paso 4 ocurre en `jobs.lever.co/x/...`, la
URL misma revela el token: **el paso 4 alimenta al paso 2 para la próxima vez.**

### 5. La zona ámbar, delimitada

El paso 3 es el único fuera del verde, y se define por extensión:

- 🟡 **Es**: pedir la página de empleo **de la web de la empresa** y leer su
  bloque `application/ld+json` de tipo `JobPosting` — datos que la empresa
  publica *explícitamente para que los lean máquinas*, porque es el requisito de
  Google para aparecer en Google for Jobs. Con `robots.txt` respetado,
  `User-Agent` identificado, rate limit, y **solo** para vacantes que ya pasaron
  la Capa 1.
- 🔴 **No es**: tocar `linkedin.com`, `glassdoor.com` o `indeed.com`. Sin
  excepciones, ni siquiera vía terceros (ver Alternativas).

La diferencia no es de grado sino de naturaleza: una es la web pública de una
empresa que quiere ser encontrada; la otra es una plataforma con login cuyos
términos lo prohíben.

### 6. El parseo de correos es determinista; el LLM es el respaldo

RF-06 pedía extracción **con LLM** por robustez. Va al revés.

Los correos de LinkedIn, Glassdoor y Computrabajo son **generados por
plantilla**: HTML estable e idéntico entre correos del mismo remitente. Pasarlos
por un LLM es pagar tokens por un problema que un parser determinista resuelve
gratis, más rápido y de forma testeable.

> **Parser determinista por remitente. LLM (Haiku) solo cuando el parser falla**
> — y cuando falla, su salida se convierte en la **especificación del siguiente
> parser**.

Eso satisface RNF-07 mejor que "LLM siempre", porque convierte el fallo en algo
**visible y accionable** en vez de absorberlo en un costo variable permanente.
Es el mismo principio del [[0028-experience-como-contenedor-y-cobertura-garantizada]]:
el LLM propone donde hay ambigüedad genuina, el código determinista hace el resto.

Los parsers son **funciones puras** (correo de fixture → `RawJob`), testeables
sin red, sin Gmail y sin LLM.

**Dónde interviene el LLM en toda la Fase 2:**

| Paso | Modelo | Frecuencia |
|---|---|---|
| Parseo de correo | Haiku | solo ante fallo del parser |
| Estructurar un JD crudo (pasos 3–4 de la cascada) | Haiku | solo esos dos pasos |
| Capa 3 · scoring | Sonnet | solo el top ~20 |
| Capa 4 · tailoring | Sonnet | solo las `apply` |

Las Capas 0, 1 y el dedup no tocan el LLM. La Capa 2 usa el *embedder*, que no
es un LLM de razonamiento.

### 7. La captura asistida y su frontera

Un **bookmarklet** (marcador cuyo destino es `javascript:`) lee el texto de la
página que el usuario **ya está viendo**, en su navegador y con su sesión, y lo
envía a la API local, que lo empareja con la vacante delgada ya almacenada.

La frontera queda escrita como **restricción, no como recomendación**:

> Es **iniciado por el usuario**, **una vacante a la vez**, sobre una página que
> **ya estaba abierta**, **sin navegación automática** y **sin lotes**. Es
> copy-paste con ergonomía. Deja de ser aceptable el día que el código navegue
> solo, recorra una lista, o se dispare sin un clic explícito.

Esto no contradice §5 del PRD ("fuera de alcance: autorelleno por automatización
de navegador"): aquello prohibía *automatizar el navegador como canal de envío*.
Esto es lo contrario — el humano actúa y la máquina solo recibe.

## Alternativas descartadas

- **Añadir la descripción al parseo del correo.** No está en el correo. No es
  una cuestión de mejor parsing.
- **Scraping de LinkedIn/Glassdoor.** Prohibido por D2 y §5 del PRD. El riesgo
  es la cuenta del usuario, que es justamente el activo de descubrimiento.
- **APIs de pago que revenden datos de LinkedIn/Glassdoor** (JSearch, TheirStack,
  Mantiks, LoopCV, actors de Apify). Buena parte del mercado de "job APIs" de
  2026 es **scraping envuelto en una API**. Pagar no borra la violación de
  términos: la terceriza y le pone factura. Se descarta por principio, no por
  precio.
- **Enriquecer todo antes del embudo.** Multiplica peticiones (y, en los pasos
  3–4, tokens) por vacantes que la Capa 1 iba a descartar igualmente.
- **Esperar a que LinkedIn abra una API de búsqueda.** No existe y no hay señal
  de que vaya a existir para casos de uso individuales.
- **Extensión de navegador desde el principio.** Es la herramienta correcta a
  largo plazo (ver Consecuencias), pero exige manifiesto, permisos, build y
  revisión de store para validar una hipótesis que un bookmarklet de ~30 líneas
  valida igual.

## Consecuencias

**A favor**

- El descubrimiento aprovecha el matching que LinkedIn/Glassdoor ya hacen contra
  el perfil real del usuario — personalización gratuita e imposible de replicar
  con búsquedas por parámetros.
- El LLM prácticamente no toca la ingesta: entra en dos puntos acotados y con
  Haiku. El gasto real sigue concentrado en las Capas 3 y 4, sobre unas pocas
  vacantes.
- Ninguna vacante se pierde: el peor caso de la cascada es el flujo de la Fase 1,
  que ya está construido y funcionando.
- `company_ats` es un activo que **compone**: cada empresa resuelta una vez se
  enriquece gratis para siempre.
- Cero cambios en la Fase 1. `TailorDocuments` recibe un `Job` igual que hoy.
- `apps/worker`, hoy un esqueleto, por fin tiene contenido: colas de ingesta,
  enriquecimiento y scoring.

**En contra**

- **La tasa de acierto del paso 2 es desconocida hasta medirla**, y podría ser
  baja para el mercado LATAM. Mitigado por la cascada y por instrumentar el paso
  que resolvió cada vacante.
- **Los parsers por remitente son mantenimiento recurrente**: cuando LinkedIn
  cambie su plantilla, el parser se rompe. Mitigado con el respaldo del LLM y con
  una alerta, pero es trabajo periódico que antes el plan escondía dentro del
  "LLM robusto".
- **El paso 4 exige acción del usuario.** Es una fricción real, aunque sobre una
  página que iba a abrir de todos modos.
- **La zona ámbar es una decisión de riesgo, no un hecho.** Está acotada y
  argumentada, pero es una postura del proyecto y podría requerir revisión si
  algún sitio la objeta.

### Deuda consciente: la seguridad del endpoint de captura

El endpoint `POST /capture` recibe peticiones desde orígenes **arbitrarios**
(cualquier sitio de empleo), así que **una lista blanca de orígenes no puede ser
la defensa**. Y conviene decirlo con precisión:

> **CORS protege *lecturas*, no *escrituras*.** `Access-Control-Allow-Origin`
> decide si la página que llamó puede **leer la respuesta**; no impide que la
> petición **llegue**. Con `Content-Type: text/plain` (una *simple request*) no
> hay preflight: el navegador envía primero.

Es decir, la exposición **existe desde el primer día en local**, solo que con
impacto bajo (datos basura en una base personal de un solo usuario).

**Decisión para el MVP local — deliberada, no descuido:** `text/plain` con
`Access-Control-Allow-Origin: *` en ese único endpoint, más cuatro
endurecimientos baratos:

1. Escuchar solo en `127.0.0.1`, nunca en `0.0.0.0`.
2. Validar la cabecera `Host` (`localhost`/`127.0.0.1`) — cierra la clase entera
   de **DNS rebinding**, donde un dominio del atacante se re-resuelve a
   `127.0.0.1` para esquivar las protecciones de origen.
3. Un `captureToken` por perfil, **rotable**, con alcance deliberadamente
   mínimo: solo rellenar la descripción de una vacante que ya existe. No lee, no
   lista, no borra.
4. Guardar el JD como **texto, nunca como HTML**, y escapar al pintar (el JD
   viene de un tercero: es XSS almacenado si se confía).

Más límite de tamaño, rate limit y validación Zod.

**Regla que gobierna las tres versiones:**

> El endpoint de captura se diseña **asumiendo que su credencial ya está
> filtrada**. Su alcance debe ser tan estrecho que un atacante con el token
> completo solo pueda ensuciar datos, nunca leerlos ni destruirlos.

Esto importa porque **un bookmarklet no puede guardar un secreto**: su código se
ejecuta *dentro de la página hostil*, que puede leerlo. Es una propiedad
estructural, no un defecto de implementación. Por lo mismo, la página podría
reescribir `fetch` y observar lo que se envía — interceptación *en el DOM*, no en
el cable (en local no hay cable: el tráfico no sale de la interfaz loopback).

**Si algún día se despliega, no se parchea el CORS: se cambia la arquitectura.**
El bookmarklet deja de llamar a la API y pasa a abrir un **popup en el propio
dominio del producto**, al que le entrega el contenido por `postMessage`. Ese
popup es **same-origin** con la API: desaparece el CORS, la sesión por cookie
funciona con `SameSite=Lax` bloqueando el CSRF cross-site, el bookmarklet deja de
llevar secretos, y el usuario **ve y confirma** la captura (nada silencioso). La
graduación completa es una **extensión de navegador**, que tiene origen propio y
almacenamiento que la página no puede leer. Y HTTPS con HSTS es obligatorio en
cualquier despliegue.
