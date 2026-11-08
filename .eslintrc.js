module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/ban-types': 'warn',
    'prefer-const': 'error',
    'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
  },
  ignorePatterns: ['**/dist/**', '**/*.d.ts', 'node_modules/'],
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      env: { jest: true },
    },
    {
      // El `jsonb` de drizzle-orm hace un JSON.stringify que sobra con
      // postgres.js: guarda el JSON como cadena y lo deja inconsultable desde
      // SQL. Usar siempre el de src/columns.ts. Ver ADR-0024.
      files: ['packages/db/src/**/*.ts'],
      excludedFiles: ['packages/db/src/columns.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'drizzle-orm/pg-core',
                importNames: ['jsonb'],
                message:
                  "Usa el `jsonb` de './columns' (ADR-0024): el de drizzle guarda el JSON doblemente codificado y rompe las consultas SQL.",
              },
            ],
          },
        ],
      },
    },
  ],
};
