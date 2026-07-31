# ADR-0021: Design tokens ("Señal") y tema claro/oscuro sin tocar componentes

> Estado: **Aceptado** · Fecha: 2026-07-31

## Contexto

La UI necesitaba una identidad propia (no la plantilla genérica de turno) y
soportar **tema claro y oscuro desde el inicio**. El riesgo evidente: que cada
componente tuviera que conocer el tema y decidir sus colores, duplicando lógica
en toda la app.

## Decisión

**Dirección "Señal"**: acento *emerald* sobre base neutra, superficies
translúcidas con blur y header flotante tipo píldora. El nombre viene del PRD
(el producto es un copiloto *high-signal*): el verde **es la señal** que destaca
sobre el ruido.

Se implementa con **design tokens**: variables CSS en formato **canal RGB**
(`--accent: 52 211 153`, sin `rgb()` ni comas), mapeadas a colores de Tailwind
con `<alpha-value>`. Eso permite aplicarles opacidad —`bg-accent/10`,
`ring-accent/20`— que es la base de la estética translúcida.

Cambiar de tema = poner/quitar la clase `dark` en `<html>`. Solo cambian los
**valores** de los tokens; los componentes no se enteran ni se re-renderizan: lo
resuelve la cascada CSS, no React. El toggle solo alterna la clase y persiste la
elección; un script inline en el layout la aplica **antes del primer pintado**
para evitar el parpadeo de tema equivocado (FOUC).

Detalles que el sistema encapsula:

- El acento **cambia de tono por contexto**: `emerald-400` en oscuro (brilla),
  `emerald-600` en claro (`emerald-400` no cumpliría contraste AA sobre blanco).
- `color-scheme: light|dark` en los tokens, para que los controles **nativos**
  (dropdown de un `<select>`, scrollbars) sigan el tema.
- Cuatro recetas repetidas viven en `@layer components` (`.glass`, `.card`,
  `.btn-primary`, `.chip-accent`) en vez de repetir 8 utilidades por elemento.

Regla de decoración (elegida "vistosa", pero con sistema): glows permitidos en
heros, estados vacíos y el **momento del resultado**; prohibidos en formularios
densos y listas. Máximo dos por viewport.

## Alternativas descartadas

- **Una librería de componentes** (Chakra/Horizon): trae su propio sistema de
  estilos y adaptarlo a esta estética es pelear contra sus defaults. Las
  referencias que definieron la dirección son Tailwind puro.
- **Colores en hex directos en las clases**: imposible aplicar opacidad con la
  sintaxis de Tailwind y obliga a duplicar cada color en variante `dark:`.
- **Pasar el tema por Context de React**: obligaría a que todo componente
  "temeable" fuese Client Component y se re-renderizara al cambiar de tema.

## Consecuencias

- Un componente bien escrito funciona en ambos temas **sin saber cuál está
  activo**. Cambiar la identidad entera = tocar un archivo (`globals.css`).
- Cero dependencias de UI: solo Tailwind + `lucide-react` para iconos (sin build
  nativo, compatible con la política de supply-chain).
- Coste: hay que recordar usar los tokens (`bg-bg`, `text-fg`, `text-accent`) en
  vez de colores sueltos de Tailwind; si no, el tema se rompe en una de las dos
  variantes.
