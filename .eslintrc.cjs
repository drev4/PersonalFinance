module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  ignorePatterns: ['packages/mobile/**', 'packages/api/**'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'import',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': [
      'warn',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      },
    ],
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    // Type-checking already catches missing default exports; the TS resolver
    // false-positives on React's UMD-style `export =` default export.
    'import/default': 'off',
    // The TS resolver resolves subpaths like `date-fns/locale` to the same
    // file as `date-fns`, so --fix unsafely merges them into one import
    // statement, pulling in bindings that don't exist on the base module.
    'import/no-duplicates': 'off',
    'no-console': [
      'warn',
      {
        allow: ['warn', 'error'],
      },
    ],
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        project: ['packages/web/tsconfig.json', 'tsconfig.base.json'],
      },
    },
  },
};
