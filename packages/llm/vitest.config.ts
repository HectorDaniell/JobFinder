import { defineConfig } from 'vitest/config';

/**
 * Config de Vitest para @jobfinder/llm.
 *
 * Solo configuramos coverage; el resto usa los defaults (entorno node,
 * busca los archivos .test.ts). El coverage se activa con el flag --coverage.
 */
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      // Qué medir: solo nuestro código fuente.
      include: ['src/**/*.ts'],
      // Qué ignorar: barrels (solo re-exportan) y archivos de solo-tipos
      // (no tienen lógica que ejecutar, darían 0% engañoso).
      exclude: ['src/**/index.ts', 'src/claude/types.ts'],
      reporter: ['text', 'html'], // text = tabla en consola; html = reporte navegable
    },
  },
});
