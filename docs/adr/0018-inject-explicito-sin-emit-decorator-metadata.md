# ADR-0018: `@Inject` explícito en los controladores (DI sin `emitDecoratorMetadata`)

> Estado: **Aceptado** · Fecha: 2026-07-08

## Contexto

Los tests e2e arrancan el contenedor real de Nest, así que la inyección de
dependencias debe resolverse en runtime. La DI **por tipo**
(`constructor(private x: Repo)`) depende de la metadata `design:paramtypes`, que
solo se emite con `emitDecoratorMetadata`. **Vitest transpila con esbuild, que no
emite esa metadata** → los providers llegaban como `undefined` (500 en los e2e).

## Decisión

Anotar cada dependencia de los controladores con **`@Inject(Token)`** explícito:

```ts
constructor(
  @Inject(ProfileRepository) private readonly profiles: ProfileRepository
) {}
```

Con el token explícito, Nest no necesita la metadata de tipos reflejada. Los
providers del `InfraModule` ya usan `useFactory` + `inject`, que tampoco la
necesitan.

## Alternativas descartadas

- **Transpilar los tests con SWC** (`unplugin-swc`), que sí emite la metadata: es
  la solución estándar de Nest+Vitest, pero `@swc/core` es un **binario nativo**
  cuyo script de build choca con la política de supply-chain del proyecto (pnpm
  `allowBuilds` en `pnpm-workspace.yaml`). Preferimos no relajar esa política por
  un tema de tests.
- **Activar `emitDecoratorMetadata` en esbuild**: esbuild no lo soporta.

## Consecuencias

- La DI funciona con el esbuild por defecto de Vitest; **cero dependencias
  nativas** nuevas; la política de supply-chain queda intacta.
- Coste: los constructores son algo más verbosos (`@Inject(Token)` repetido, con
  el token igual al tipo).
- Regla para nuevos controladores/providers inyectados por constructor: anotarlos
  con `@Inject(Token)`.
