import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

interface BoundaryRule {
  readonly packageDir: string;
  readonly forbiddenPackages: readonly string[];
  readonly forbiddenRuntimeLibraries: readonly string[];
}

interface AppBoundaryRule {
  readonly appDir: string;
  readonly forbiddenPackage: string;
  readonly forbiddenAppDir: string;
}

const RULES: readonly BoundaryRule[] = [
  {
    packageDir: "packages/shared",
    forbiddenPackages: [
      "@game/core",
      "@game/data",
      "@game/persistence",
      "@game/gameplay",
      "@game/client",
      "@game/server",
    ],
    forbiddenRuntimeLibraries: ["react", "react-dom", "phaser", "fastify"],
  },
  {
    packageDir: "packages/core",
    forbiddenPackages: ["@game/shared", "@game/data", "@game/persistence", "@game/gameplay"],
    forbiddenRuntimeLibraries: ["react", "react-dom", "phaser", "fastify"],
  },
  {
    packageDir: "packages/data",
    forbiddenPackages: ["@game/core", "@game/persistence", "@game/gameplay"],
    forbiddenRuntimeLibraries: ["react", "react-dom", "phaser", "fastify"],
  },
  {
    packageDir: "packages/persistence",
    forbiddenPackages: ["@game/data", "@game/gameplay"],
    forbiddenRuntimeLibraries: ["react", "react-dom", "phaser", "fastify"],
  },
  {
    packageDir: "packages/gameplay",
    forbiddenPackages: [],
    forbiddenRuntimeLibraries: ["react", "react-dom", "phaser", "fastify"],
  },
];

const APP_RULES: readonly AppBoundaryRule[] = [
  {
    appDir: "apps/client",
    forbiddenPackage: "@game/server",
    forbiddenAppDir: "apps/server",
  },
  {
    appDir: "apps/server",
    forbiddenPackage: "@game/client",
    forbiddenAppDir: "apps/client",
  },
];

async function listSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listSourceFiles(fullPath));
    } else if (
      entry.isFile()
      && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
      && !entry.name.endsWith(".d.ts")
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

function collectModuleSpecifiers(sourceText: string, fileName: string): string[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const specifiers: string[] = [];

  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier !== undefined
      && ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length === 1
      && ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return specifiers;
}

function matchesPackage(specifier: string, packageName: string): boolean {
  return specifier === packageName || specifier.startsWith(`${packageName}/`);
}

function normalize(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function isAppEscape(specifier: string, sourceFile: string): boolean {
  if (!specifier.startsWith(".")) return false;
  const normalized = normalize(path.resolve(path.dirname(sourceFile), specifier));
  return normalized.includes("/apps/client/") || normalized.includes("/apps/server/");
}

function resolvesInside(specifier: string, sourceFile: string, targetRoot: string): boolean {
  if (!specifier.startsWith(".")) return false;
  const resolved = normalize(path.resolve(path.dirname(sourceFile), specifier));
  const normalizedTarget = normalize(path.resolve(targetRoot));
  return resolved === normalizedTarget || resolved.startsWith(`${normalizedTarget}/`);
}

async function readDeclaredDependencies(packageRoot: string): Promise<Record<string, string>> {
  const packageJson = JSON.parse(
    await readFile(path.join(packageRoot, "package.json"), "utf8"),
  ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  return {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
}

async function checkRule(repoRoot: string, rule: BoundaryRule): Promise<string[]> {
  const errors: string[] = [];
  const packageRoot = path.join(repoRoot, rule.packageDir);
  const declaredDependencies = await readDeclaredDependencies(packageRoot);
  const forbiddenDependencies = [
    ...rule.forbiddenPackages,
    ...rule.forbiddenRuntimeLibraries,
  ];

  for (const dependency of forbiddenDependencies) {
    if (dependency in declaredDependencies) {
      errors.push(`${rule.packageDir}/package.json must not depend on '${dependency}'`);
    }
  }

  for (const sourceFile of await listSourceFiles(path.join(packageRoot, "src"))) {
    const sourceText = await readFile(sourceFile, "utf8");
    for (const specifier of collectModuleSpecifiers(sourceText, sourceFile)) {
      const forbidden = forbiddenDependencies.find((candidate) => matchesPackage(specifier, candidate));
      if (forbidden !== undefined) {
        errors.push(
          `${path.relative(repoRoot, sourceFile)} imports forbidden boundary '${specifier}'`,
        );
      } else if (isAppEscape(specifier, sourceFile)) {
        errors.push(
          `${path.relative(repoRoot, sourceFile)} must not import from an app layer ('${specifier}')`,
        );
      }
    }
  }

  return errors;
}

async function checkAppRule(repoRoot: string, rule: AppBoundaryRule): Promise<string[]> {
  const errors: string[] = [];
  const appRoot = path.join(repoRoot, rule.appDir);
  const forbiddenAppRoot = path.join(repoRoot, rule.forbiddenAppDir);
  const declaredDependencies = await readDeclaredDependencies(appRoot);

  if (rule.forbiddenPackage in declaredDependencies) {
    errors.push(`${rule.appDir}/package.json must not depend on '${rule.forbiddenPackage}'`);
  }

  for (const sourceFile of await listSourceFiles(path.join(appRoot, "src"))) {
    const sourceText = await readFile(sourceFile, "utf8");
    for (const specifier of collectModuleSpecifiers(sourceText, sourceFile)) {
      if (matchesPackage(specifier, rule.forbiddenPackage)) {
        errors.push(
          `${path.relative(repoRoot, sourceFile)} imports forbidden sibling app '${specifier}'`,
        );
      } else if (resolvesInside(specifier, sourceFile, forbiddenAppRoot)) {
        errors.push(
          `${path.relative(repoRoot, sourceFile)} must not import from '${rule.forbiddenAppDir}' ('${specifier}')`,
        );
      }
    }
  }

  return errors;
}

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const errors = (
    await Promise.all([
      ...RULES.map((rule) => checkRule(repoRoot, rule)),
      ...APP_RULES.map((rule) => checkAppRule(repoRoot, rule)),
    ])
  ).flat();

  if (errors.length > 0) {
    console.error("Architecture boundary check failed:\n");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("Architecture boundary check passed.");
}

await main();
