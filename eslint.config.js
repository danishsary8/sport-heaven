import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['src/lib/api/types.gen.ts', 'dist', 'coverage', 'node_modules', 'public', 'test-results', 'playwright-report', '.claude'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Best-effort localStorage writes intentionally swallow errors.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Legacy pages (mock-store driven) will be rewritten against the real API;
      // downgrade the noisy React Compiler-era rule until then.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    files: ['*.config.{js,ts}', 'scripts/**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
);
