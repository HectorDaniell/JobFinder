# ADR-0013: `DocumentPort` — contrato de generación de documentos

> Estado: **Aceptado** · Fecha: 2026-06-28

## Contexto

El Sprint 3 introduce `packages/documents`, el adapter que convierte el
`TailoredCv` y la carta (texto) del Sprint 2 en archivos descargables **PDF** y
**DOCX**. En arquitectura hexagonal, un *adapter* implementa un *puerto* del core.

A diferencia del Sprint 2 —donde `LlmPort` ya existía— **no hay ningún puerto
para documentos**. Hay que decidir dónde vive el contrato y qué forma tiene, en
particular el tipo de los bytes de salida: el core debe permanecer
**agnóstico al framework** (solo depende de `zod`).

## Decisión

Creamos `DocumentPort` en `packages/core/src/ports/DocumentPort.ts`:

```ts
export type DocFormat = 'pdf' | 'docx';

export interface DocumentArtifact {
  bytes: Uint8Array;   // no Buffer: mantiene el core agnóstico a Node
  mimeType: string;
  filename: string;    // nombre sugerido; la app puede sobreescribirlo
}

export interface DocumentPort {
  generateCv(cv: TailoredCv, profile: Profile, lang: 'es'|'en', format: DocFormat): Promise<DocumentArtifact>;
  generateCoverLetter(letter: string, profile: Profile, lang: 'es'|'en', format: DocFormat): Promise<DocumentArtifact>;
}
```

- **`bytes: Uint8Array`** (no `Buffer`): `Buffer` es de Node; el core no debe
  atarse a un runtime. Un `Buffer` *ya es* un `Uint8Array`, así que el adapter
  devuelve el suyo sin conversión.
- **Reutiliza `TailoredCv`** (definido en `LlmPort`, ver ADR-0010): es el mismo
  contrato de salida del LLM que entra al generador. Un solo tipo compartido.
- **`generateCoverLetter` recibe la carta ya escrita** (`string`): el contenido
  lo produce el LLM; este puerto solo se ocupa del *formato del archivo*.

## Alternativas descartadas

- **No crear puerto; exportar las clases concretas de `documents`** — la futura
  API dependería del detalle concreto en vez de una abstracción; rompe la
  simetría con `llm`/`db` y dificulta intercambiar el generador o testearlo.
- **`Buffer` en la firma** — ata el core (framework-agnóstico) al runtime de Node.
- **Poner el puerto dentro de `documents`** — el core es el hogar de los
  contratos; si el puerto viviera en el adapter, cualquier consumidor tendría
  que importar el adapter solo para conocer el contrato.
- **Pasar `Job` a los métodos** — no se necesita: el nombre de archivo se arma
  con el candidato (`Profile`) y la carta ya viene completa (YAGNI).

## Consecuencias

- `documents` **implementa** `DocumentPort`; la flecha de dependencia sigue
  apuntando al core (igual que `llm` y `db`).
- El cableado (Sprint 4) inyecta el adapter donde se espera un `DocumentPort`:
  intercambiable y testeable sin tocar a los consumidores.
- `DocumentArtifact` lleva `mimeType` + `filename`: todo lo necesario para
  servir una descarga HTTP o persistir el archivo, sin lógica extra.
- `DocumentPort` importa `TailoredCv` del archivo `LlmPort`. Es un acoplamiento
  a nivel de *tipo* (no del puerto LLM). Aceptable por ser un único tipo; si en
  el futuro hubiera varios tipos compartidos entre puertos, se moverían a un
  módulo neutro.
