# Architecture Decision Records (ADR)

Un **ADR** registra *una* decisión técnica importante: su contexto, la decisión
tomada, las alternativas descartadas y sus consecuencias. El objetivo es que tu
yo-futuro (u otro desarrollador) entienda **por qué** algo es como es, sin tener
que re-litigar la decisión.

> Regla: el código y los tipos documentan el **qué**; los ADR documentan el **por qué**.

## Formato

Usamos el formato de **Michael Nygard** (el estándar de la industria). Cada ADR
es un archivo corto con estas secciones:

- **Estado** — Propuesto · Aceptado · Reemplazado por ADR-XXXX
- **Contexto** — la situación y las fuerzas en juego
- **Decisión** — lo que decidimos hacer
- **Alternativas descartadas** — qué más se consideró y por qué no
- **Consecuencias** — lo que gana y lo que cuesta esta decisión

## Numeración

Las decisiones **fundacionales (001–008)** están resumidas en la tabla de
[`ARQUITECTURA.md` §18](../ARQUITECTURA.md). Los ADR completos en archivo
**empiezan en 0009** para mantener una sola secuencia global. (Las 001–008 se
pueden "backfillear" como archivos más adelante si hiciera falta.)

## Índice

| ADR | Título | Estado |
|-----|--------|--------|
| [0009](0009-modelos-claude-por-niveles.md) | Modelos Claude por niveles (Sonnet para tailoring) | Aceptado |
| [0010](0010-tailoredcv-contrato-unico-en-core.md) | `TailoredCv` como contrato único en el core | Aceptado |
| [0011](0011-bulletprovider-puerto-del-consumidor.md) | `BulletProvider`: puerto definido por el consumidor | Aceptado |
| [0012](0012-prompts-como-archivos-txt.md) | Prompts como archivos `.txt` versionados | Aceptado |
| [0013](0013-documentport-contrato-de-generacion.md) | `DocumentPort`: contrato de generación de documentos | Aceptado |
| [0014](0014-pdfkit-sobre-puppeteer.md) | `pdfkit` para generar PDF (en vez de Puppeteer) | Aceptado |
| [0015](0015-modelo-intermedio-de-documento.md) | Modelo intermedio entre el contenido y los formatos | Aceptado |
| [0016](0016-validacion-zod-y-errores-de-dominio.md) | Validación con Zod + traducción de errores de dominio | Aceptado |
| [0017](0017-llm-perezoso-arranque-sin-api-key.md) | LLM perezoso: la API arranca sin `ANTHROPIC_API_KEY` | Aceptado |
| [0018](0018-inject-explicito-sin-emit-decorator-metadata.md) | `@Inject` explícito (DI sin `emitDecoratorMetadata`) | Aceptado |
| [0019](0019-rutas-de-next-en-vez-de-spa-con-tabs.md) | Rutas de Next en vez de una SPA con tabs | Aceptado |
| [0020](0020-estado-context-y-localstorage-sin-redux.md) | Estado: Context + localStorage (sin Redux ni SWR) | Aceptado |
| [0021](0021-design-tokens-senal-y-tema-claro-oscuro.md) | Design tokens "Señal" y tema claro/oscuro | Aceptado |
| [0022](0022-llm-falso-para-desarrollo-sin-creditos.md) | LLM falso tras un flag para desarrollar sin créditos | Aceptado (temporal) |
| [0023](0023-contencion-en-vez-de-jaccard-anti-invencion.md) | Contención en vez de Jaccard en el anti-invención | Aceptado |

## Cómo agregar uno

1. Copia el siguiente número libre.
2. Crea `NNNN-titulo-corto-en-kebab-case.md` con las secciones de arriba.
3. Agrégalo al índice.
4. Si reemplaza a otro ADR, marca el viejo como "Reemplazado por ADR-NNNN".
