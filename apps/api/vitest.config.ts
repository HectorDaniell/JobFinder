import { defineConfig } from 'vitest/config';

/**
 * Config de Vitest para la API (NestJS).
 *
 * Transpilamos con el esbuild por defecto de Vitest; solo le indicamos que
 * acepte los decoradores de Nest (experimentalDecorators). reflect-metadata se
 * carga en el setup. NO dependemos de emitDecoratorMetadata: la inyección de los
 * controllers usa @Inject(Token) explícito, así que la DI funciona sin la
 * metadata de tipos reflejada.
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
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts', 'src/main.ts', 'src/load-env.ts', 'src/**/*.module.ts'],
      reporter: ['text', 'html'],
    },
  },
});
