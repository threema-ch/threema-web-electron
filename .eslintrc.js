module.exports = {
  plugins: ["@typescript-eslint"],

  extends: ["eslint:recommended", "prettier"],

  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    ecmaFeatures: {
      impliedStrict: true,
    },
  },

  env: {
    es2020: true,
  },

  rules: {
    // Possible errors
    "no-console": "error",
    "no-loss-of-precision": "off", // @typescript-eslint/no-loss-of-precision
    "no-promise-executor-return": "error",
    "no-template-curly-in-string": "error",
    "no-unreachable-loop": "error",
    "no-unsafe-optional-chaining": "error",
    "require-atomic-updates": "error",

    // Best practices
    "array-callback-return": "error",
    "block-scoped-var": "error",
    "consistent-return": "error",
    "curly": ["error", "all"],
    "default-case": "error",
    "default-case-last": "error",
    "default-param-last": "off", // @typescript-eslint/default-param-last
    "eqeqeq": ["error", "always"],
    "grouped-accessor-pairs": ["error", "getBeforeSet"],
    "guard-for-in": "error",
    "no-alert": "error",
    "no-caller": "error",
    "no-constructor-return": "error",
    "no-eval": "error",
    "no-extend-native": "error",
    "no-implicit-globals": "error",
    "no-implied-eval": "error",
    "no-invalid-this": "off", // @typescript-eslint/no-invalid-this
    "no-iterator": "error",
    "no-labels": "error",
    "no-lone-blocks": "error",
    "no-loop-func": "error",
    "no-multi-str": "error",
    "no-new": "error",
    "no-new-func": "error",
    "no-new-wrappers": "error",
    "no-nonoctal-decimal-escape": "error",
    "no-octal-escape": "error",
    "no-proto": "error",
    "no-return-assign": "error",
    "no-script-url": "error",
    "no-self-compare": "error",
    "no-sequences": "error",
    "no-throw-literal": "error",
    "no-unmodified-loop-condition": "error",
    "no-unused-expressions": "off", // @typescript-eslint/no-unused-expressions
    "no-useless-call": "error",
    "no-useless-concat": "error",
    "no-void": [
      "error",
      {
        allowAsStatement: true,
      },
    ],
    "prefer-named-capture-group": "error",
    "prefer-promise-reject-errors": "error",
    "prefer-regex-literals": [
      "error",
      {
        disallowRedundantWrapping: true,
      },
    ],
    "radix": ["error", "always"],
    "require-await": "error",
    "require-unicode-regexp": "error",

    // Variables
    "no-shadow": "off", // @typescript-eslint/no-shadow
    "no-unused-vars": "off", // @typescript-eslint/no-unused-vars

    // Stylistic issues
    "camelcase": "error",
    "func-names": "error",
    "func-style": [
      "error",
      "declaration",
      {
        allowArrowFunctions: false,
      },
    ],
    "max-depth": [
      "error",
      {
        max: 4,
      },
    ],
    "new-cap": "error",
    "no-array-constructor": "error",
    "no-bitwise": "error",
    "no-lonely-if": "error",
    // TODO: https://github.com/prettier/prettier/issues/187
    // 'no-mixed-operators': 'error',
    "no-nested-ternary": "error",
    "no-new-object": "error",
    "no-unneeded-ternary": "error",
    "operator-assignment": ["error", "always"],
    "prefer-exponentiation-operator": "error",
    "prefer-object-spread": "error",

    // ES6 features
    "arrow-parens": "error",
    "arrow-body-style": ["error", "as-needed"],
    "no-dupe-class-members": "off", // @typescript-eslint/no-dupe-class-members
    "no-duplicate-imports": "off", // @typescript-eslint/no-duplicate-imports
    "no-useless-constructor": "off", // @typescript-eslint/no-useless-constructor
    "no-useless-computed-key": "error",
    "no-useless-rename": "error",
    "no-var": "error",
    "object-shorthand": "error",
    "prefer-arrow-callback": "error",
    "prefer-const": "error",
    "prefer-destructuring": [
      "error",
      {
        AssignmentExpression: {
          object: false,
        },
      },
    ],
    "prefer-numeric-literals": "error",
    "prefer-rest-params": "error",
    "prefer-spread": "error",
    "prefer-template": "error",
    "symbol-description": "error",
  },

  overrides: [
    // General JavaScript rules
    {
      files: "*.js",
      env: {
        node: true,
      },
      rules: {
        "no-console": "off",
        "prefer-named-capture-group": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-require-imports": "off",
      },
    },

    // General TypeScript rules
    {
      files: "*.ts",
      extends: [
        "plugin:@typescript-eslint/recommended-type-checked",
        "plugin:@typescript-eslint/stylistic-type-checked",
      ],
      env: {
        node: true,
      },
      parserOptions: {
        project: "./tsconfig.base.json",
      },
      rules: {
        // Overrides
        "no-return-await": "off", // @typescript-eslint/return-await
        "require-await": "off", // @typescript-eslint/require-await

        // TypeScript rules
        "@typescript-eslint/await-thenable": "error",
        "@typescript-eslint/explicit-function-return-type": "error",
        "@typescript-eslint/explicit-member-accessibility": "error",
        "@typescript-eslint/naming-convention": [
          "error",

          // Camelcase-ish equivalents
          {
            selector: "default",
            format: ["strictCamelCase"],
          },
          {
            selector: "variable",
            format: ["strictCamelCase", "UPPER_CASE"],
            trailingUnderscore: "allow",
          },
          {
            selector: "parameter",
            format: ["strictCamelCase"],
            trailingUnderscore: "allow",
          },
          {
            selector: "memberLike",
            modifiers: ["private"],
            format: ["strictCamelCase"],
            leadingUnderscore: "require",
          },
          {
            selector: "typeLike",
            format: ["PascalCase"],
          },

          // Treat enums as constants (upper-case)
          {
            selector: "enumMember",
            format: ["UPPER_CASE"],
          },

          // Allow properties to be constants (upper-case).
          {
            selector: "property",
            format: ["strictCamelCase", "UPPER_CASE", "PascalCase"],
            leadingUnderscore: "allow",
          },

          // Allow properties to include a dash (used for HTTP headers)
          {
            selector: "property",
            format: ["PascalCase"],
            filter: {
              regex: "[- ]",
              match: true,
            },
          },

          // Require an underscore prefix for protected members
          {
            selector: "memberLike",
            modifiers: ["protected"],
            format: ["strictCamelCase"],
            leadingUnderscore: "require",
          },
        ],
        "@typescript-eslint/no-base-to-string": "error",
        "@typescript-eslint/no-throw-literal": "error",
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-misused-promises": "error",
        "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
        "@typescript-eslint/no-unnecessary-condition": "error",
        "@typescript-eslint/no-unnecessary-qualifier": "error",
        "@typescript-eslint/no-unnecessary-type-arguments": "error",
        "@typescript-eslint/no-unsafe-argument": "error",
        // '@typescript-eslint/non-nullable-type-assertion-style': 'error', // TODO: Bugged
        "@typescript-eslint/prefer-includes": "error",
        "@typescript-eslint/prefer-nullish-coalescing": "error",
        "@typescript-eslint/prefer-readonly": "error",
        "@typescript-eslint/prefer-reduce-type-parameter": "error",
        "@typescript-eslint/prefer-string-starts-ends-with": "error",
        "@typescript-eslint/promise-function-async": "error",
        "@typescript-eslint/require-array-sort-compare": "error",
        "@typescript-eslint/strict-boolean-expressions": [
          "error",
          {
            allowString: false,
            allowNumber: false,
          },
        ],
        "@typescript-eslint/switch-exhaustiveness-check": "error",
        "@typescript-eslint/unbound-method": [
          "error",
          {
            ignoreStatic: true,
          },
        ],
        "@typescript-eslint/require-await": "error",
        "@typescript-eslint/return-await": ["error", "always"],

        // TypeScript features also applicable to JavaScript files
        "@typescript-eslint/array-type": [
          "error",
          {
            default: "array-simple",
          },
        ],
        "@typescript-eslint/ban-ts-comment": [
          "error",
          {
            "ts-expect-error": "allow-with-description",
          },
        ],
        "@typescript-eslint/ban-types": [
          "error",
          {
            extendDefaults: true,
            types: {
              null: {
                message: "Use undefined instead",
                fixWith: "undefined",
              },
            },
          },
        ],
        "@typescript-eslint/class-literal-property-style": "error",
        "@typescript-eslint/consistent-type-assertions": [
          "error",
          {
            assertionStyle: "as",
            // Note: Needed due to heavy usage of new-types
            objectLiteralTypeAssertions: "allow",
          },
        ],
        "@typescript-eslint/consistent-type-definitions": [
          "error",
          "interface",
        ],
        "@typescript-eslint/method-signature-style": "error",
        "@typescript-eslint/no-confusing-non-null-assertion": "error",
        "@typescript-eslint/no-dynamic-delete": "error",
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-extraneous-class": "error",
        "@typescript-eslint/no-invalid-void-type": "error",
        "@typescript-eslint/no-require-imports": "error",
        "@typescript-eslint/prefer-for-of": "error",
        "@typescript-eslint/prefer-literal-enum-member": "error",
        "@typescript-eslint/prefer-optional-chain": "error",
        "@typescript-eslint/prefer-ts-expect-error": "error",
        "@typescript-eslint/unified-signatures": "error",
        "@typescript-eslint/default-param-last": "error",
        "@typescript-eslint/no-dupe-class-members": "error",
        "@typescript-eslint/no-invalid-this": "error",
        "@typescript-eslint/no-loss-of-precision": "error",
        "@typescript-eslint/no-shadow": "error",
        "@typescript-eslint/no-unused-expressions": "error",
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            args: "none",
          },
        ],
        "@typescript-eslint/no-useless-constructor": "error",

        // Disabled rules
        "@typescript-eslint/restrict-template-expressions": "off",
      },
    },

    // App
    {
      files: ["app/*.d.ts", "app/src/**"],
      env: {
        node: true,
      },
      parserOptions: {
        project: "./app/tsconfig.json",
      },
    },

    // Test
    {
      files: ["test/*.d.ts", "test/**"],
      env: {
        node: true,
      },
      parserOptions: {
        project: "./test/tsconfig.json",
      },
    },
  ],
};
