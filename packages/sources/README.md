# @jobfinder/sources

Adapters de **ingesta**. La ingesta ocurre en dos tiempos con propiedades
opuestas, y este paquete alberga las dos familias sin mezclarlas (ADR-0029):

| | Qué responde | Sirve el correo |
|---|---|---|
| **Descubrir** | ¿qué vacantes existen? | ✅ excelente |
| **Enriquecer** | ¿qué dice esa vacante? | ❌ inútil |

Un correo de alerta **no es una vacante, es una notificación**: tarjeta más
enlace de seguimiento. La descripción vive detrás del enlace, tras un login. Por
eso los parsers producen vacantes **delgadas**, y dejar `description` sin definir
es el comportamiento correcto, no un fallo.

## Estado

| Pieza | Estado |
|---|---|
| Contrato `EmailJobParser` + `ParseOutcome` | ✅ |
| Registro/enrutado por remitente | ✅ 12 tests |
| Parser de LinkedIn | ✅ 9 tests (fixture real sanitizado) |
| Parser de Glassdoor | ✅ 8 tests (fixture real sanitizado) |


| `GmailSource` (RF-05, OAuth) | ✅ 5 tests (OAuth2 + decodificación MIME) |
| Enrichers de ATS (Greenhouse, Lever, Ashby) | ⬜ |


## Por qué parsers deterministas y no un LLM

RF-06 pedía extracción **con LLM** por robustez. Va al revés, y ADR-0029 lo
invierte: los correos de alerta son **generados por plantilla**, con HTML
idéntico entre correos del mismo remitente. Pasarlos por un LLM es pagar tokens
por un problema que un parser resuelve gratis, más rápido y de forma testeable.

> Parser determinista por remitente. LLM (Haiku) **solo** cuando el parser falla
> o el remitente es desconocido.

Eso cumple RNF-07 mejor que "LLM siempre", porque convierte el fallo en algo
**visible y accionable** en vez de absorberlo en un coste variable permanente.

### Las tres respuestas del registro

Distinguirlas es lo que evita que un parser se pudra en silencio:

| Resultado | Significa | Qué hacer |
|---|---|---|
| `parsed` | funcionó | ingerir las vacantes |
| `empty` | remitente **conocido**, cero vacantes | **la plantilla cambió** — arreglar el parser que se nombra |
| `unknown-sender` | nadie reclama esa dirección | respaldo con LLM |

Un correo de alerta existe *porque* había vacantes que anunciar. Cero desde un
remitente conocido casi nunca es un correo vacío: es rotura. Colapsar `empty`
dentro de `parsed: []` es exactamente cómo se pierde esa señal.

El registro **solo enruta**. No llama al LLM: eso haría que `sources` dependiera
de `llm` y metería una API key en un paquete cuyo valor es ser testeable sin
ninguna. Decide el llamador (el futuro `IngestJobs`).

## Fixtures: cómo se prepara un correo real

Los parsers necesitan HTML **real** — inventar el marcado sería testear una
ficción. Pero un `.eml` crudo trae la dirección del usuario, su nombre, tokens
ligados a su cuenta y enlaces de baja que son **capacidades vivas**: quien tenga
esa URL puede darte de baja de tus alertas.

```bash
node packages/sources/scripts/sanitize-eml.js ~/Downloads/alerta.eml \
     packages/sources/tests/fixtures/emails/linkedin-job-alert.html
```

Lo que hace el script:

1. **Tira el sobre MIME entero** — `Received`, `ARC-Seal`, `DKIM-Signature`,
   `Message-ID`, `List-Unsubscribe`. No es limpieza: es que el parser recibe un
   `EmailMessage` y decodificar MIME es trabajo del **adaptador de Gmail**. Eso
   elimina la mayor parte del riesgo gratis.
2. Decodifica *quoted-printable* y se queda solo con la parte `text/html`.
3. Sustituye dirección y nombre por marcadores (los saca del `To:`, no hay que
   configurarlos).
4. Neutraliza `midToken`, `midSig`, `eid`, `trk`, `lipi`, `savedSearchId`,
   `utm_*` y los enlaces de baja.
5. Hace un **barrido de residuos** y sale con código 2 si algo sobrevivió.

### La regla que gobierna el saneado

> **Se sustituyen los valores, se conservan las formas.**

`midToken=AQH_1lie...` pasa a `midToken=REDACTED`, no se borra el parámetro: el
parser tiene que seguir enfrentándose a una URL con ocho parámetros de basura
alrededor del ID. Y el ID de la vacante **se queda** — es dato público de una
oferta pública, y extraerlo es justo para lo que existe el parser.

`*.eml` está en `.gitignore`. Los originales no entran al repo nunca.

## Comandos

```bash
pnpm --filter @jobfinder/sources run test
pnpm --filter @jobfinder/sources run test:coverage
```
