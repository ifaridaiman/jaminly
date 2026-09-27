// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'src/generated/**', 'dist/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
  {
    // Vendor SDKs live only in src/infrastructure (ARCHITECTURE §3.3). Type-only Prisma imports are fine.
    files: ['src/modules/**/*.ts', 'src/common/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@prisma/*', '**/generated/prisma/**', 'pg', '@aws-sdk/*', 'nodemailer', 'firebase-admin', 'expo-server-sdk', 'google-auth-library'],
              allowTypeImports: true,
              message: 'Vendor SDKs belong in src/infrastructure. Use the exported service instead.',
            },
          ],
        },
      ],
    },
  },
  {
    // supertest bodies are `any`; assertions check their shape.
    files: ['test/**/*.ts', 'src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
);
