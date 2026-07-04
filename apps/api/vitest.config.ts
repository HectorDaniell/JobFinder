import { defineConfig } from 'vitest/config';

/**
 * Config de Vitest para la API (NestJS).
 *
 * Dos añadidos respecto a los packages (que son framework-agnósticos y no usan
 * decoradores):
 *  - esbuild.tsconfigRaw.experimentalDecorators: Vitest transpila con esbuild;
 *    esto le dice que acepte los decoradores de Nest (@Catch, @Controller, …).
 *  - setupFiles: ['reflect-metadata']: polyfill que esos decoradores usan EN
 *    RUNTIME para registrar su metadata. Se carga una vez antes de los tests.
 */
export default defineConfig({
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
      },
    },
  },
  test: {
    setupFiles: ['reflect-metadata'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Qué ignorar: barrels, arranque y módulos de wiring (no tienen lógica
      // de negocio que ejecutar; darían 0% engañoso).
      exclude: [
        'src/**/index.ts',
        'src/main.ts',
        'src/load-env.ts',
        'src/**/*.module.ts',
      ],
      reporter: ['text', 'html'],
    },
  },
});
