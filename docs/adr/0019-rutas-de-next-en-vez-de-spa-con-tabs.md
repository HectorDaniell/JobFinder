# ADR-0019: Rutas de Next (App Router) en vez de una SPA con tabs

> Estado: **Aceptado** · Fecha: 2026-07-31

## Contexto

La UI tiene cinco pantallas (landing, alta de perfil, tailoring, bullets, perfil)
con dos modos de uso muy distintos: un **setup** que se hace una vez y un **uso
diario** (pegar una oferta y generar). Había que decidir la estructura de
navegación: una sola página con pestañas/vistas condicionales, o rutas reales.

## Decisión

**Una ruta por pantalla** con el App Router de Next (`app/tailor/page.tsx`, etc.),
navegadas del lado del cliente. Un **header flotante** con tres enlaces (Tailor,
Bullets, Perfil); `/setup` no se enlaza: solo se llega si no hay perfil.

Las guardas de navegación viven en cada pantalla y dependen del `profileId`
(ver ADR-0020): sin perfil → `/setup`; con perfil, la landing y `/setup` te
llevan a `/tailor` y `/profile` respectivamente.

Los **tabs se reservan para variaciones dentro de una pantalla** —el preview
CV | Carta del resultado—, no como estructura de la app. El **stepper** se usa
solo dentro de `/setup`: un proceso lineal, largo y que se hace una vez.

## Alternativas descartadas

- **SPA de una sola URL con tabs**: F5 devuelve al estado inicial, no se puede
  compartir ni marcar una pantalla, y hay que reimplementar el botón "atrás".
  Además obliga a cargar todo el JS de golpe.
- **Sidebar en vez de header**: artillería pesada para tres enlaces; roba ancho
  útil en una app cuyo contenido principal es un formulario largo.

## Consecuencias

- URLs compartibles y marcables; recargar mantiene la pantalla; el botón "atrás"
  del navegador funciona sin código extra.
- Code splitting automático: cada ruta carga solo su JS.
- Las redirecciones dependen de `localStorage`, así que ocurren en el cliente
  (efecto + `router.replace`, para no ensuciar el historial). Eso obliga a un
  flag `ready` mientras se lee el estado, o habría parpadeo (ADR-0020).
- Coste: cinco carpetas en vez de un archivo; a cambio, remamos a favor del
  framework.
