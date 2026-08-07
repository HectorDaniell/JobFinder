# ADR-0024 — Columna `jsonb` propia, sin doble codificación

**Estado:** Aceptado · **Fecha:** 2026-08-06

## Contexto

Todo el JSON de la base (`profile.preferences`, `profile.links`, `job.raw`,
`job.salary`, `application.answers`…) se estaba guardando **doblemente
codificado**: Postgres recibía una *cadena que contiene JSON* en vez del objeto.

```
jsonb_typeof(preferences)  ->  'string'   (debería ser 'object')
preferences->>'modality'   ->  NULL       (no se puede consultar)
```

La causa está en la interacción de dos capas que hacen el mismo trabajo. Se
verificó leyendo `drizzle-orm@0.30/pg-core/columns/jsonb.js`:

```js
mapToDriverValue(value) { return JSON.stringify(value); }
```

Nuestro driver es **`postgres.js`**, que ya serializa por su cuenta los objetos
destinados a una columna `json`/`jsonb`. Con el `stringify` de Drizzle por
delante, el valor se convierte a texto dos veces. Postgres hace lo correcto con
lo que recibe: una cadena JSON válida es un valor JSON válido, así que la guarda
como tal.

**Por qué no se detectó antes.** El camino de vuelta es simétrico:
`mapFromDriverValue` hace `JSON.parse` si recibe una cadena. Objeto → cadena →
objeto. La aplicación nunca nota nada y ningún test falla; el dato solo se ve
roto desde SQL.

Se comprobó empíricamente con una sonda contra la base real: pasándole un objeto
JS al driver, Postgres guarda `object` y `->>'modality'` devuelve `remote`;
pasándole lo que le entrega Drizzle, guarda `string` y la consulta devuelve NULL.

**Por qué importa ahora.** La **Capa 1 del embudo de matching (RF-11)** existe
para descartar cientos de vacantes barato, con un `WHERE` en Postgres contra las
preferencias duras. Con el JSON opaco eso es imposible: habría que traer todo a
memoria y filtrar en Node, que es justo lo que el embudo evita. Un índice GIN
tampoco serviría, porque indexaría una cadena.

## Decisión

Definir una columna `jsonb` propia en `packages/db/src/columns.ts` que declara el
mismo tipo SQL pero **entrega el valor tal cual**, dejando serializar solo al
driver:

```ts
export const jsonb = customType<{ data: unknown; driverData: unknown }>({
  dataType: () => 'jsonb',
  toDriver: (value) => value,
});
```

No hace falta `fromDriver`: `postgres.js` ya devuelve el `jsonb` parseado.

Acompañado de:

- **Migración `0002_fix_jsonb_double_encoding`** que repara las filas existentes
  con `(col #>> '{}')::jsonb`. Es **idempotente**: solo toca filas cuyo
  `jsonb_typeof` sea `'string'`, así que reejecutarla no hace nada.
- **Regla de ESLint** (`no-restricted-imports`) que prohíbe importar `jsonb`
  desde `drizzle-orm/pg-core` dentro de `packages/db/src`, salvo en `columns.ts`.

## Alternativas descartadas

- **Subir de versión `drizzle-orm`.** Arrastra cambios que afectan a todo el
  schema y a los repositorios, para arreglar una sola incompatibilidad conocida.
  Desproporcionado y más arriesgado que un tipo de 8 líneas.
- **Envolver cada escritura en `sql` crudo.** Resuelve el síntoma en cada sitio,
  hay que acordarse siempre, y se pierde el tipado de Drizzle.
- **Dejarlo y filtrar en memoria.** Contradice el diseño del embudo
  (ARQUITECTURA §8): la Capa 1 es barata *porque* es SQL.
- **Guardar el JSON como `text`** y parsear en la app. Renuncia a indexar y a
  consultar, que es lo único que `jsonb` aporta sobre `text`.

## Consecuencias

**A favor**

- El JSON vuelve a ser consultable e indexable desde SQL. La Capa 1 del embudo
  es viable tal como está diseñada.
- El arreglo está contenido en un archivo; el schema solo cambia un import.
- La regla de lint impide la regresión, que de otro modo sería invisible.

**En contra**

- Nos separamos del tipo de serie de Drizzle: si una versión futura corrige el
  `stringify`, habrá que revisar este tipo (quedaría redundante, no roto).
- El tipo es `unknown`, igual que el de serie, así que los repositorios siguen
  necesitando su `as`/validación con Zod al leer. No empeora, pero tampoco mejora.
- El daño ya existente se reparó cuando era mínimo (1 fila, 2 columnas). De
  haberse descubierto tras la ingesta de la Fase 2, la migración habría tenido
  que recorrer miles de filas.
