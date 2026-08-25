import { readdir } from "node:fs/promises";
import path from "node:path";

const FORBIDDEN_SUFFIXES = [".js.map", ".d.ts.map"] as const;

async function directoryExists(dir: string): Promise<boolean> {
  try {
    await readdir(dir);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function listWorkspaceSourceDirectories(repoRoot: string): Promise<string[]> {
  const sourceDirs: string[] = [];

  for (const root of ["apps", "packages"] as const) {
    const absoluteRoot = path.join(repoRoot, root);
    for (const entry of await readdir(absoluteRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const sourceDir = path.join(absoluteRoot, entry.name, "src");
      if (await directoryExists(sourceDir)) sourceDirs.push(sourceDir);
    }
  }

  return sourceDirs;
}

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const violations: string[] = [];

  for (const sourceDir of await listWorkspaceSourceDirectories(repoRoot)) {
    for (const file of await listFiles(sourceDir)) {
      const normalized = file.split(path.sep).join("/");
      if (FORBIDDEN_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) {
        violations.push(path.relative(repoRoot, file).split(path.sep).join("/"));
      }
    }
  }

  if (violations.length > 0) {
    console.error("Generated source artifact check failed:\n");
    for (const violation of violations.sort()) {
      console.error(`- ${violation}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Generated source artifact check passed.");
}

await main();
