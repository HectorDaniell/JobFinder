# ADR-0020: Estado con Context + localStorage (sin Redux ni SWR)

> Estado: **Aceptado** · Fecha: 2026-07-31

## Contexto

La app necesita recordar qué perfil está activo entre pantallas y entre sesiones,
además de manejar datos que vienen de la API y el estado efímero de los
formularios. La pregunta habitual ("¿Redux, Zustand, SWR?") es la equivocada: lo
primero es distinguir **qué tipos de estado** hay.

## Decisión

Clasificar el estado en tres tipos y usar en cada uno lo más simple que sirva:

| Tipo | Qué es | Ejemplos | Solución |
|---|---|---|---|
| **De servidor** | su fuente de verdad es la BD | perfil, bullets, resultado del tailor | se pide a la API cuando hace falta; **no** se duplica en un store |
| **Global de cliente** | poco, transversal a la UI | `profileId`, tema | React **Context** + `localStorage` |
| **Local de UI** | efímero, de un componente | borrador de formulario, tab activo, "cargando" | `useState` donde se usa |

`ProfileProvider` expone `{ profileId, ready, setProfileId, clearProfile }` y
memoiza el valor emitido con `useMemo` (si no, cada render re-renderizaría a
todos los consumidores). El hook `useProfile()` encapsula `useContext` y falla
con un mensaje claro si se usa fuera del provider.

El flag **`ready`** es necesario porque `localStorage` no existe en el servidor:
el primer render sale con `profileId = null` y solo un efecto (ya en el
navegador) puede leer el valor real. Sin `ready`, las pantallas no distinguirían
"no hay perfil" de "todavía no lo he leído" y mostrarían un parpadeo.

El **tema** no pasa por React: el toggle escribe la clase `dark` en `<html>` y la
cascada CSS hace el resto (ADR-0021).

## Alternativas descartadas

- **Redux / Zustand**: la app tiene exactamente **dos** datos globales de
  cliente. Un store externo añade dependencia y ceremonia sin resolver nada que
  el Context no resuelva en 20 líneas.
- **SWR / React Query** (venían en el scaffold): excelentes para caché e
  invalidación, pero esconden justo el ciclo de datos que este proyecto quiere
  hacer explícito. Se retiraron junto con `axios`.
- **Meter el estado de servidor en un store global**: duplica la BD en el
  navegador y se desincroniza. Tras cada mutación sincronizamos la lista
  localmente con **la respuesta del servidor** (append/replace/filter), sin
  re-fetchear.

## Consecuencias

- Cero dependencias de estado; todo con React puro.
- La escalada queda documentada: `useState` → subir al padre → Context → store
  externo **solo si el Context duele**.
- `setProfileId` escribe en dos sitios a propósito: `localStorage` (persistencia,
  sobrevive al refresh) y `useState` (reactividad, avisa a React). Cada uno cubre
  lo que el otro no puede.
