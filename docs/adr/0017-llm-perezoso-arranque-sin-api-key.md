# ADR-0017: LLM perezoso — la API arranca sin `ANTHROPIC_API_KEY`

> Estado: **Aceptado** · Fecha: 2026-07-08

## Contexto

El `ClaudeClient` valida la `ANTHROPIC_API_KEY` en su constructor (lanza
`InvalidAnthropicKeyError` si falta). El composition root (`InfraModule`)
construye los providers **al arrancar** la app. Si construyéramos el
`ClaudeClient` ahí de forma directa, la API entera **no levantaría sin la key**
—ni `/health` ni el CRUD—, aunque solo `/tailor` la necesita. Eso bloquea el
desarrollo mientras no haya clave/créditos.

## Decisión

Envolver el `LlmPort` en un **proxy perezoso** (`createLazyLlm`, en
`apps/api/src/infra/lazy-llm.ts`): al arrancar solo se crea un objeto con los 4
métodos del puerto; el `ClaudeClient` real se construye en la **primera llamada**
a una operación del LLM (es decir, al invocar `POST /tailor`), leyendo la key en
ese momento y memoizando el cliente.

## Alternativas descartadas

- **Construcción ansiosa (eager)**: fail-fast al arrancar. La app no levanta sin
  la key, aunque el 90% de los endpoints no la usan.
- **Key dummy en `.env`**: arranca, pero mezcla configuración real con basura y
  `/tailor` fallaría de forma confusa (401 del SDK) en vez de un error claro.

## Consecuencias

- La API arranca y sirve el CRUD **sin** `ANTHROPIC_API_KEY`; solo `/tailor` la
  exige, y si falta responde `500 INVALID_ANTHROPIC_KEY` (vía el filtro).
- El cliente se crea **una vez** (memoización) y se reutiliza entre llamadas.
- Coste: una pequeña capa de indirección (el proxy) en `apps/api/src/infra`.
- Los tests e2e no necesitan la key: sustituyen `TailorDocuments` por un doble.
