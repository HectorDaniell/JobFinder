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

## Cómo agregar uno

1. Copia el siguiente número libre.
2. Crea `NNNN-titulo-corto-en-kebab-case.md` con las secciones de arriba.
3. Agrégalo al índice.
4. Si reemplaza a otro ADR, marca el viejo como "Reemplazado por ADR-NNNN".
