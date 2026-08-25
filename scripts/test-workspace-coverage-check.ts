import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

interface PackageJson {
  readonly scripts?: Readonly<Record<string, string>>;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listWorkspaceDirectories(repoRoot: string): Promise<string[]> {
  const roots = ["apps", "packages"] as const;
  const directories: string[] = [];

  for (const root of roots) {
    const absoluteRoot = path.join(repoRoot, root);
    for (const entry of await readdir(absoluteRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const relativeDir = `${root}/${entry.name}`;
      if (await fileExists(path.join(repoRoot, relativeDir, "package.json"))) {
        directories.push(relativeDir);
      }
    }
  }

  return directories.sort();
}

function extractWorkspaceEntries(sourceText: string): ReadonlySet<string> {
  const sourceFile = ts.createSourceFile(
    "vitest.workspace.ts",
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const entries = new Set<string>();

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === "defineWorkspace"
      && node.arguments.length === 1
      && ts.isArrayLiteralExpression(node.arguments[0])
    ) {
      for (const element of node.arguments[0].elements) {
        if (ts.isStringLiteral(element)) entries.add(element.text.replace(/\\/g, "/"));
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return entries;
}

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const workspaceFile = path.join(repoRoot, "vitest.workspace.ts");
  const workspaceEntries = extractWorkspaceEntries(await readFile(workspaceFile, "utf8"));
  const errors: string[] = [];

  for (const packageDir of await listWorkspaceDirectories(repoRoot)) {
    const packageJson = JSON.parse(
      await readFile(path.join(repoRoot, packageDir, "package.json"), "utf8"),
    ) as PackageJson;
    const testScript = packageJson.scripts?.test;
    if (testScript === undefined || !/\bvitest\b/.test(testScript)) continue;

    if (!workspaceEntries.has(packageDir)) {
      errors.push(`${packageDir} has a Vitest test script but is missing from vitest.workspace.ts`);
    }

    const configCandidates = await Promise.all([
      fileExists(path.join(repoRoot, packageDir, "vitest.config.ts")),
      fileExists(path.join(repoRoot, packageDir, "vitest.config.js")),
    ]);
    if (!configCandidates.some(Boolean)) {
      errors.push(`${packageDir} has a Vitest test script but no vitest.config.ts/js`);
    }
  }

  if (errors.length > 0) {
    console.error("Vitest workspace coverage check failed:\n");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("Vitest workspace coverage check passed.");
}

await main();
