# ADR-0022: LLM falso tras un flag para desarrollar sin créditos

> Estado: **Aceptado** (temporal) · Fecha: 2026-07-31

## Contexto

La pantalla de tailoring —el corazón del producto— no se podía construir ni
verificar sin `ANTHROPIC_API_KEY` con saldo. Hacía falta una forma de ejercitar
el flujo completo mientras tanto, sin que la solución contaminara el código de
producción ni diera una falsa sensación de "esto ya funciona".

## Decisión

Sustituir **únicamente la llamada a Claude** por un doble local
(`apps/api/src/infra/fake-llm.ts`), activado con `USE_FAKE_LLM=true`. La
elección se hace en el **composition root** (`infra.module.ts`), no dentro de la
lógica.

Todo lo demás corre de verdad: el perfil y los bullets salen de Postgres, y
`DocumentAdapter` genera **PDF y DOCX reales** (es local y no necesita ninguna
API key). El doble además:

- **usa los bullets reales** del perfil y los ordena por coincidencia de skills
  con la descripción de la vacante — nunca inventa texto;
- **respeta los errores de dominio** del adapter real (`ProfileHasNoBulletsError`
  → 422), para que la UI ejercite los mismos caminos que ejercitará con Claude.

## Alternativas descartadas

- **Mockear el endpoint entero en el frontend**: no probaría nada del backend
  (ni la generación de documentos, ni el mapeo de errores, ni la serialización a
  base64) y dejaría código de mentira en la app que consume el usuario.
- **Grabar/reproducir respuestas reales (VCR)**: requiere una llamada real
  primero — justo lo que no teníamos.
- **Esperar a tener la key**: bloquearía el sprint entero por un trámite de pago.

## Consecuencias

- El flujo end-to-end quedó verificado con archivos reales (magic numbers `%PDF`
  y `PK\x03\x04`) antes de gastar un céntimo.
- Activar Claude de verdad = poner la key y el flag en `false`. **Cero cambios de
  código.**
- Es **andamiaje temporal, no producto**: cuando el flujo con Claude esté
  validado en uso real, `fake-llm.ts` y el flag deberían borrarse. Mientras
  exista, hay un camino de ejecución que no representa el comportamiento real
  (por ejemplo, no ejercita los guardrails anti-invención del adapter).
