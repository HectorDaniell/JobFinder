# ADR-0011: `BulletProvider` — puerto definido por el consumidor

> Estado: **Aceptado** · Fecha: 2026-06-27

## Contexto

`LlmPort.tailorCv(job, profile, lang)` no recibe los bullets, pero la
implementación los necesita (para inyectarlos en el prompt y para validar
anti-invención). `Profile` tampoco los trae como campo. Es decir: el
`ClaudeAdapter` debe obtener los bullets de algún lado.

La fuente real es `BulletRepository`, que vive en `packages/db`.

## Decisión

`ClaudeAdapter` **declara lo que necesita** como una interfaz que él mismo posee,
en `packages/llm`:

```ts
export interface BulletProvider {
  findByProfileId(profileId: string): Promise<Bullet[]>;
}
```

El constructor recibe un `BulletProvider`. Gracias al **tipado estructural** de
TypeScript, `BulletRepository` (de `db`) cumple esa forma sin saberlo. El
cableado (Sprint 4) hace: `new ClaudeAdapter(client, bulletRepo)`.

Esto es el **Principio de Inversión de Dependencias**: depender de una
abstracción que controlas, no de un detalle concreto que no controlas.

## Alternativas descartadas

- **`llm` importa `BulletRepository` de `db`** — acopla dos adapters; obliga a
  levantar Postgres para *adaptar un CV*; vuelve imposible testear `llm` aislado.
- **Meter `bullets` dentro de `Profile`** — contamina la entidad de dominio con
  datos que no siempre se necesitan.
- **Cambiar la firma de `LlmPort.tailorCv`** — rompería el contrato del puerto.

## Consecuencias

- `llm` **no depende de `db`**; la flecha de dependencia sigue apuntando al core.
- En tests, se inyecta un `BulletProvider` falso de pocas líneas (sin BD real).
- El adapter no sabe ni le importa de dónde salen los bullets.
