import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(import.meta.dirname, "../../../..");
const DEFAULT_REFERENCE = "apps/client/public/assets/characters/hero-broadsword-attack-sheet-v1.png";
const DEFAULT_SOURCE_DIR = ".tmp/spritesheet-imports";
const DEFAULT_FRAME_COUNT = 6;
const ANIMATIONS = ["idle", "walk", "attack", "death"] as const;

type Animation = (typeof ANIMATIONS)[number];

type GeneratedAsset = {
  readonly animation: Animation;
  readonly source: string;
  readonly output: string;
  readonly frameCount: number;
  readonly calibrationFrame: number;
  readonly cellWidth?: number;
  readonly cellHeight?: number;
  readonly scale?: number;
};

function getArgValue(name: string): string | undefined {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (exact !== undefined) return exact.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function getRequiredSlug(name: string): string {
  const raw = getArgValue(name)?.trim().toLowerCase();
  if (raw === undefined || raw.length === 0) throw new Error(`Missing required ${name}=<id>`);
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(raw)) throw new Error(`Invalid ${name}: ${raw}`);
  return raw.replaceAll("_", "-");
}

function getIntegerArg(name: string, fallback: number): number {
  const raw = getArgValue(name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid ${name}: ${raw}`);
  return value;
}

function toRepoRelative(path: string): string {
  return relative(REPO_ROOT, path).replaceAll("\\", "/");
}

function normalizeFileToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/\.png$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findAnimationSource(sourceDir: string, weaponId: string, animation: Animation): string | undefined {
  const pngs = readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png"))
    .map((entry) => entry.name);
  const candidates = pngs.filter((name) => {
    const normalized = normalizeFileToken(name);
    return normalized.includes(weaponId) && normalized.split("-").includes(animation);
  });
  if (candidates.length > 1) {
    throw new Error(`Multiple ${animation} sources found for ${weaponId}: ${candidates.join(", ")}`);
  }
  const candidate = candidates[0];
  return candidate === undefined ? undefined : resolve(sourceDir, candidate);
}

function runGenerator(args: readonly string[]): string {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(command, ["generate:spritesheet", "--", ...args], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    stdio: "pipe",
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  if (result.status !== 0) {
    throw new Error(`Spritesheet generation failed.\n${stdout}${stderr}`.trim());
  }
  process.stdout.write(stdout);
  if (stderr.length > 0) process.stderr.write(stderr);
  return stdout;
}

function parseGeneratedMetrics(stdout: string): { cellWidth?: number; cellHeight?: number; scale?: number } {
  const cellMatch = stdout.match(/cell=(\d+)x(\d+)/);
  const scaleMatch = stdout.match(/scale=([0-9.]+)/);
  return {
    ...(cellMatch === null ? {} : { cellWidth: Number(cellMatch[1]), cellHeight: Number(cellMatch[2]) }),
    ...(scaleMatch === null ? {} : { scale: Number(scaleMatch[1]) }),
  };
}

const weaponId = getRequiredSlug("--weapon");
const sourceDirRaw = getArgValue("--source-dir")?.trim();
const sourceDir = resolve(
  REPO_ROOT,
  sourceDirRaw === undefined || sourceDirRaw.length === 0 ? DEFAULT_SOURCE_DIR : sourceDirRaw,
);
if (!existsSync(sourceDir)) throw new Error(`Source directory does not exist: ${sourceDir}`);

const referenceRaw = getArgValue("--reference")?.trim();
const reference = resolve(
  REPO_ROOT,
  referenceRaw === undefined || referenceRaw.length === 0 ? DEFAULT_REFERENCE : referenceRaw,
);
if (!existsSync(reference)) throw new Error(`Reference does not exist: ${reference}`);

const frameCount = getIntegerArg("--frame-count", DEFAULT_FRAME_COUNT);
if (frameCount <= 0) throw new Error("--frame-count must be greater than 0");
const referenceFrame = getIntegerArg("--reference-frame", 0);
const referenceFrameCount = getIntegerArg("--reference-frame-count", DEFAULT_FRAME_COUNT);
const globalCalibrationFrame = getIntegerArg("--calibration-frame", 0);
const outputDir = resolve(REPO_ROOT, "apps/client/public/assets/characters");
mkdirSync(outputDir, { recursive: true });

const generated: GeneratedAsset[] = [];
for (const animation of ANIMATIONS) {
  const source = findAnimationSource(sourceDir, weaponId, animation);
  if (source === undefined) continue;

  const calibrationFrame = getIntegerArg(`--${animation}-calibration-frame`, globalCalibrationFrame);
  const output = resolve(outputDir, `hero-${weaponId}-${animation}-sheet-v1.png`);
  console.log(`\n[${weaponId}] ${animation}: ${basename(source)} -> ${basename(output)}`);
  const stdout = runGenerator([
    `--input=${toRepoRelative(source)}`,
    `--reference=${toRepoRelative(reference)}`,
    `--reference-frame=${String(referenceFrame)}`,
    `--reference-frame-count=${String(referenceFrameCount)}`,
    `--output=${toRepoRelative(output)}`,
    `--frame-count=${String(frameCount)}`,
    `--calibration-frame=${String(calibrationFrame)}`,
  ]);
  generated.push({
    animation,
    source: toRepoRelative(source),
    output: toRepoRelative(output),
    frameCount,
    calibrationFrame,
    ...parseGeneratedMetrics(stdout),
  });
}

if (generated.length === 0) {
  throw new Error(
    `No supported spritesheets found in ${toRepoRelative(sourceDir)} for weapon ${weaponId}. Expected filenames containing the weapon id and one of: idle, walk, attack, death.`,
  );
}

const reportPath = resolve(sourceDir, `generation-report-${weaponId}.json`);
const report = {
  schemaVersion: 2,
  weaponId,
  sourceDir: toRepoRelative(sourceDir),
  reference: toRepoRelative(reference),
  referenceFrame,
  referenceFrameCount,
  generated,
};
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf-8");

console.log(`\nGenerated ${String(generated.length)} spritesheet(s).`);
console.log(`Assets: ${generated.map((entry) => entry.output).join(", ")}`);
console.log(`Report: ${toRepoRelative(reportPath)}`);
console.log("Next step: visual validation before game wiring.");
