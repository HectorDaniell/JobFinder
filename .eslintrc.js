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
  ],
};
