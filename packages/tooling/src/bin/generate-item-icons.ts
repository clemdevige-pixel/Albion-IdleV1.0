import { mkdirSync, readdirSync, existsSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(import.meta.dirname, "../../../..");
const MASTER_ROOT = join(REPO_ROOT, "apps/client/assets/items/masters");
const LEGACY_MASTER_ROOT = join(REPO_ROOT, "apps/client/public/assets/items");
const ICON_ROOT = join(REPO_ROOT, "apps/client/public/assets/items/icons");
const SHARP_CLI = "sharp-cli@6.0.0";
const CATEGORIES = ["armes", "equipements"] as const;

function listPngFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".png")
    .map((entry) => join(directory, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

function resolveSources(category: (typeof CATEGORIES)[number]): Array<{ source: string; outputDir: string }> {
  const canonicalDir = join(MASTER_ROOT, category);
  const canonical = listPngFiles(canonicalDir);
  const outputDir = join(ICON_ROOT, category);

  if (canonical.length > 0) {
    return canonical.map((source) => ({ source, outputDir }));
  }

  // Transitional fallback for the current repository state: existing public masters
  // are accepted only when an icon with the same filename already exists.
  const existingIcons = new Set(listPngFiles(outputDir).map((file) => basename(file)));
  return listPngFiles(LEGACY_MASTER_ROOT)
    .filter((source) => existingIcons.has(basename(source)))
    .map((source) => ({ source, outputDir }));
}

function resolvePnpmInvocation(): { command: string; prefixArgs: string[] } {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath !== undefined && npmExecPath.length > 0) {
    return { command: process.execPath, prefixArgs: [npmExecPath] };
  }

  return {
    command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    prefixArgs: [],
  };
}

function generateIcon(source: string, outputDir: string): void {
  mkdirSync(outputDir, { recursive: true });
  const { command, prefixArgs } = resolvePnpmInvocation();
  const args = [
    ...prefixArgs,
    "dlx",
    SHARP_CLI,
    "-i",
    source,
    "-o",
    outputDir,
    "-f",
    "png",
    "trim",
    "0",
    "--",
    "resize",
    "128",
    "128",
    "--fit",
    "contain",
    "--background",
    "rgba(0,0,0,0)",
  ];

  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    const details = [
      result.error?.message,
      result.stdout,
      result.stderr,
    ].filter((value): value is string => typeof value === "string" && value.length > 0).join("\n").trim();
    throw new Error(`Failed to generate ${basename(source)}${details.length > 0 ? `\n${details}` : ""}`);
  }
}

const sources = CATEGORIES.flatMap(resolveSources);
if (sources.length === 0) {
  throw new Error(
    `No item masters found. Drop PNG masters in ${MASTER_ROOT}/armes or ${MASTER_ROOT}/equipements.`,
  );
}

for (const { source, outputDir } of sources) {
  generateIcon(source, outputDir);
  console.log(`generated ${basename(source)}`);
}

console.log(`Generated ${String(sources.length)} inventory icons.`);
