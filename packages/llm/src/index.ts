/**
 * BARREL EXPORT RAÍZ: @jobfinder/llm
 *
 * Punto de entrada del paquete. Quien haga
 *   import { ClaudeClient } from '@jobfinder/llm'
 * resuelve aquí.
 */

// Re-exporta todo lo público del módulo claude (motor, tipos, errores, guardrails).
export * from './claude';

// Embeddings (Voyage/local) → Fase 2.
// export { VoyageEmbedder } from './embeddings/voyage';
