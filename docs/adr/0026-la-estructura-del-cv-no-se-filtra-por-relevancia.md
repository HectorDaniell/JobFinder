# ADR-0026 — La estructura del CV no se filtra por relevancia

**Estado:** Aceptado · **Fecha:** 2026-08-06

## Contexto

Al agrupar el CV por empresa (Sprint 6), la primera versión omitía los empleos
para los que el LLM no había seleccionado ningún bullet. El razonamiento era que
un encabezado sin logros debajo se ve roto.

Con datos reales se vio que el razonamiento estaba mal. El perfil tiene tres
empleos:

| Empresa | Periodo |
|---|---|
| Fluyez | abr 2025 – actualidad |
| **TAC Digital** | **ago 2024 – mar 2025** |
| Switch Case Tech | ago 2023 – nov 2024 |

Para una vacante de React, Claude no eligió ninguno de los bullets de TAC Digital
—los tres son de WordPress y PHP—, así que la empresa desapareció del CV. El
resultado: Switch Case Tech terminando en nov 2024 y Fluyez empezando en abr
2025, con **cinco meses de hueco sin explicar** que TAC Digital tapaba
exactamente. Un hueco en el historial laboral es de lo primero que mira un
reclutador; un encabezado escueto no.

El mismo error afectaba a la formación: si el LLM no seleccionaba el bullet de
educación, el CV salía sin estudios.

El fondo del asunto: se estaba tratando como adaptable algo que no lo es. Dónde
trabajaste y qué estudiaste son **hechos**; lo que se adapta a la vacante son los
logros que se cuentan debajo.

## Decisión

Separar la **estructura** del CV de su **contenido adaptable**:

- **Todos** los empleos del perfil se renderizan, con su rol, empresa y periodo,
  tengan o no bullets seleccionados para esa vacante.
- **La formación siempre entra**, la haya elegido el LLM o no. Si no la eligió,
  el caso de uso la añade desde el banco (sin duplicar la versión reformulada si
  sí la eligió).
- El LLM sigue decidiendo, y solo decide, **qué logros** se cuentan.

Esa composición es una regla de negocio sobre qué lleva un CV, así que vive en
`TailorDocuments` (core) — no en el adapter de Claude ni en el de documentos.
Para poder hacerlo, el caso de uso recibe un `BulletProvider` además del
`ExperienceProvider`.

## Alternativas descartadas

- **Rellenar los empleos vacíos con un bullet genérico.** Sería inventar
  contenido, justo lo que el producto promete no hacer (RF-17).
- **Pedirle al LLM que cubra todas las empresas.** Le obligaría a forzar bullets
  irrelevantes para la vacante, y encima sin garantía de que obedezca.
- **Que el adapter de documentos decidiera qué mostrar.** Es una regla de
  negocio, no de formato: si viviera ahí, PDF y DOCX podrían divergir y el
  preview de la web mostraría algo distinto al archivo.
- **Instruirlo en el prompt en vez de componerlo en código.** Una regla que debe
  cumplirse siempre no se delega a un modelo probabilístico.

## Consecuencias

**A favor**

- El CV muestra una cronología laboral continua, sin huecos artificiales.
- La formación no puede desaparecer por un juicio de relevancia del modelo.
- El preview de la web y los archivos generados salen del **mismo** objeto ya
  compuesto: lo que ves es lo que se descarga.

**En contra**

- Un empleo puede salir con encabezado y fechas pero sin ninguna línea debajo.
  Es mejor que el hueco, pero no es el ideal: la solución de fondo es que una
  `Experience` tenga descripción propia, independiente de la vacante. Queda
  anotado como refinamiento de producto pendiente.
- `TailorDocuments` gana una dependencia más (`BulletProvider`) y deja de ser un
  simple orquestador. A cambio, ese mismo banco es el que alimenta las
  habilidades curadas (ADR-0027).
