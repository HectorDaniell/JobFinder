import { defineConfig } from 'vitest/config';

/**
 * Config de Vitest para @jobfinder/sources.
 *
 * Los parsers son funciones puras (correo → RawJob[]), así que no hace falta
 * ningún entorno especial: ni red, ni Gmail, ni LLM. Solo se configura el
 * coverage; el resto usa los defaults.
 */
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Los barrels solo reexportan y EmailJobParser.ts es solo tipos: medirlos
      // daría un 0% engañoso sobre archivos sin nada que ejecutar.
      exclude: ['src/**/index.ts', 'src/email/EmailJobParser.ts'],
      reporter: ['text', 'html'],
    },
  },
});
