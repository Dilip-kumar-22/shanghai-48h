// @ts-check
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['dist/', 'src/assets/generated/']),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  { files: ['src/**/*.ts'], languageOptions: { globals: globals.browser } },
  {
    files: ['*.config.{js,ts}', 'build/**', 'scripts/**', 'tests/**'],
    languageOptions: { globals: globals.node },
  },
);
