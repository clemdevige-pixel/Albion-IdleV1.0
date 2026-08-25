// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

const standaloneFiles = [
  "**/*.config.{js,ts}",
  "**/*.config.*.{js,ts}",
  "**/vitest.workspace.ts",
  "scripts/**/*.{js,mjs,cjs,ts}",
];

const renderingImports = ["react", "react-dom", "phaser", "fastify"];

function restrictedImportRule(paths) {
  return [
    "error",
    {
      paths: paths.map((name) => ({
        name,
        message: "Import forbidden by Albion Idle package ownership rules. See AGENTS.md and AI_BIBLE/20_DATA/20A_DATA_OWNERSHIP_AND_AGENT_RULES.txt.",
      })),
      patterns: renderingImports.map((name) => ({
        group: [`${name}/*`],
        message: "Low-level packages must remain independent from rendering/server frameworks.",
      })),
    },
  ];
}

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/*.tsbuildinfo", "AI_BIBLE/**", "coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["packages/core/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictedImportRule([
        "@game/shared",
        "@game/data",
        "@game/persistence",
        "@game/gameplay",
        ...renderingImports,
      ]),
    },
  },
  {
    files: ["packages/data/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictedImportRule([
        "@game/core",
        "@game/persistence",
        "@game/gameplay",
        ...renderingImports,
      ]),
    },
  },
  {
    files: ["packages/persistence/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictedImportRule([
        "@game/data",
        "@game/gameplay",
        ...renderingImports,
      ]),
    },
  },
  {
    files: ["packages/gameplay/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictedImportRule(renderingImports),
    },
  },
  {
    // Config and standalone script files are not part of the typed project graph.
    files: standaloneFiles,
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ["scripts/**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      globals: {
        process: "readonly",
      },
    },
  },
  prettier,
);
