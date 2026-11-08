# ADR-0025 — Degradar con gracia cuando el LLM inventa un bullet

**Estado:** Aceptado · **Fecha:** 2026-08-06

## Contexto

El guardrail anti-invención (ADR-0023) compara cada bullet reformulado por Claude
contra el banco autorizado. Hasta ahora, **un solo** bullet que no superara el
umbral tumbaba la petición entera: `GuardrailViolationError` → 422 → el usuario
se quedaba sin CV y sin carta, habiendo pagado ya las dos llamadas a Claude.

En uso real apareció el caso: para una vacante que pedía Git, Claude devolvió
*"Gestioné el control de versiones del software con Git…"*. El banco no menciona
Git por ningún lado; el guardrail lo detectó al 16% de similitud y funcionó
exactamente como debía. Pero los otros 6 bullets seleccionados **sí** venían del
banco, estaban bien reformulados, y se perdieron con él.

El fallo del guardrail era binario cuando el problema no lo es: "algunos bullets
son inventados" y "todos son inventados" son situaciones distintas y merecen
respuestas distintas.

## Decisión

`ClaudeAdapter.tailorCv` descarta **solo** los bullets que no resuelven a un
origen real y continúa con los que sí. `GuardrailViolationError` se lanza
únicamente cuando **ninguno** sobrevive, que es el caso en que no queda nada
legítimo que ofrecer.

Cada descarte deja un `console.warn` con el texto y la similitud, para que el
caso siga siendo visible en los logs y no se normalice en silencio.

En paralelo se reforzó el prompt (v1.1) para atacar la causa: se le dice
explícitamente a Claude, en los tres sitios que importan, que dejar un requisito
de la oferta sin cubrir es el resultado **correcto** cuando el banco no lo
soporta —incluso si es algo tan estándar como Git o Agile—.

## Alternativas descartadas

- **Seguir fallando entero.** Es la postura más estricta, pero castiga al usuario
  por un error del modelo y desperdicia llamadas ya pagadas. La invariante que
  importa —que nada inventado llegue al CV— se cumple igual descartando.
- **Aceptar el bullet y marcarlo en la UI.** Rompe la garantía central del
  producto (RF-17). Un dato inventado no debe llegar al documento bajo ninguna
  etiqueta.
- **Reintentar la llamada.** Duplica el costo sin garantía de mejora, y el prompt
  reforzado ataca la causa más barato.
- **Bajar el umbral de similitud.** Confunde dos problemas: el umbral ya se
  calibró con datos reales en ADR-0023, y bajarlo dejaría pasar invenciones de
  verdad.

## Consecuencias

**A favor**

- Una alucinación puntual del modelo ya no cuesta una generación completa.
- La garantía anti-invención se mantiene intacta: lo descartado no llega al CV.
- El `console.warn` conserva la señal para detectar si el modelo empieza a
  inventar más de la cuenta.

**En contra**

- El CV puede salir con menos bullets de los que Claude pretendía, sin que el
  usuario lo note en la UI. Hoy solo se ve en los logs del servidor.
- Si la tasa de invención subiera mucho, el fallo sería silencioso y gradual en
  vez de ruidoso. Cuando exista persistencia de `llm_usage` conviene registrar
  ahí los descartes para poder medirlos.
