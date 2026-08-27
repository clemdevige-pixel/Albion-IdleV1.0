import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { inflateSync } from "node:zlib";

const REPO_ROOT = resolve(import.meta.dirname, "../../../..");
const DEFAULT_REFERENCE = "apps/client/public/assets/characters/hero-broadsword-attack-sheet-v1.png";
const DEFAULT_SOURCE_DIR = ".tmp/spritesheet-imports";
const DEFAULT_FRAME_COUNT = 6;
const DEFAULT_ALPHA_THRESHOLD = 8;
const ANIMATIONS = ["idle", "walk", "attack", "death"] as const;

type Animation = (typeof ANIMATIONS)[number];

type GeneratedAsset = {
  readonly animation: Animation;
  readonly source: string;
  readonly output: string;
  readonly frameCount: number;
  readonly calibrationFrame: number;
  readonly referenceHeight: number;
  readonly sourceHeight: number;
  readonly cellWidth?: number;
  readonly cellHeight?: number;
  readonly scale?: number;
};

type RgbaImage = {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
};

type Component = {
  readonly area: number;
  readonly centerX: number;
  readonly top: number;
  readonly bottom: number;
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

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function readRgbaPng(file: string): RgbaImage {
  const png = readFileSync(file);
  const expected = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!png.subarray(0, 8).equals(expected)) throw new Error(`Not a PNG: ${file}`);

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat: Buffer[] = [];
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (type === "IHDR") {
      width = png.readUInt32BE(dataStart);
      height = png.readUInt32BE(dataStart + 4);
      bitDepth = png[dataStart + 8] ?? 0;
      colorType = png[dataStart + 9] ?? 0;
      interlace = png[dataStart + 12] ?? 0;
    } else if (type === "IDAT") {
      idat.push(png.subarray(dataStart, dataEnd));
    } else if (type === "IEND") {
      break;
    }
    offset = dataEnd + 4;
  }

  if (width <= 0 || height <= 0 || bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(`Unsupported PNG format for ${file}; expected non-interlaced RGBA8`);
  }

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const raw = inflateSync(Buffer.concat(idat));
  const pixels = new Uint8Array(width * height * bytesPerPixel);
  let rawOffset = 0;
  const previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset] ?? 0;
    rawOffset += 1;
    const row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x += 1) {
      const source = raw[rawOffset + x] ?? 0;
      const left = x >= bytesPerPixel ? (row[x - bytesPerPixel] ?? 0) : 0;
      const up = previous[x] ?? 0;
      const upLeft = x >= bytesPerPixel ? (previous[x - bytesPerPixel] ?? 0) : 0;
      let value: number;
      if (filter === 0) value = source;
      else if (filter === 1) value = (source + left) & 0xff;
      else if (filter === 2) value = (source + up) & 0xff;
      else if (filter === 3) value = (source + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) value = (source + paethPredictor(left, up, upLeft)) & 0xff;
      else throw new Error(`Unsupported PNG filter ${String(filter)} in ${file}`);
      row[x] = value;
    }
    rawOffset += stride;
    pixels.set(row, y * stride);
    row.copy(previous);
  }

  return { width, height, data: pixels };
}

function alphaAt(image: RgbaImage, x: number, y: number): number {
  return image.data[((y * image.width + x) * 4) + 3] ?? 0;
}

function findOpaqueComponents(image: RgbaImage, threshold: number): Component[] {
  const pixelCount = image.width * image.height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  const components: Component[] = [];
  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],            [1, 0],
    [-1, 1],  [0, 1],   [1, 1],
  ] as const;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const start = (y * image.width) + x;
      if (visited[start] === 1) continue;
      visited[start] = 1;
      if (alphaAt(image, x, y) <= threshold) continue;

      let head = 0;
      let tail = 0;
      queue[tail] = start;
      tail += 1;
      let area = 0;
      let sumX = 0;
      let top = y;
      let bottom = y;

      while (head < tail) {
        const current = queue[head] ?? 0;
        head += 1;
        const currentX = current % image.width;
        const currentY = Math.floor(current / image.width);
        area += 1;
        sumX += currentX;
        top = Math.min(top, currentY);
        bottom = Math.max(bottom, currentY);

        for (const [dx, dy] of neighbors) {
          const nextX = currentX + dx;
          const nextY = currentY + dy;
          if (nextX < 0 || nextX >= image.width || nextY < 0 || nextY >= image.height) continue;
          const next = (nextY * image.width) + nextX;
          if (visited[next] === 1) continue;
          visited[next] = 1;
          if (alphaAt(image, nextX, nextY) <= threshold) continue;
          queue[tail] = next;
          tail += 1;
        }
      }

      components.push({ area, centerX: sumX / Math.max(1, area), top, bottom });
    }
  }

  return components;
}

function measureCalibrationFrameHeight(file: string, frameCount: number, frameIndex: number): number {
  if (frameIndex < 0 || frameIndex >= frameCount) {
    throw new Error(`Frame ${String(frameIndex)} is outside expected range 0..${String(frameCount - 1)} for ${basename(file)}`);
  }

  const image = readRgbaPng(file);
  const components = findOpaqueComponents(image, DEFAULT_ALPHA_THRESHOLD);
  if (components.length < frameCount) {
    throw new Error(`Only ${String(components.length)} opaque components found in ${basename(file)}; cannot resolve ${String(frameCount)} character frames`);
  }

  // The six character bodies are expected to be the dominant opaque components.
  // We deliberately ignore smaller detached weapons/accessories for SCALE.
  const bodyComponents = [...components]
    .sort((a, b) => b.area - a.area)
    .slice(0, frameCount)
    .sort((a, b) => a.centerX - b.centerX);

  const selected = bodyComponents[frameIndex];
  if (selected === undefined) throw new Error(`Unable to resolve calibration frame ${String(frameIndex)} in ${basename(file)}`);
  return selected.bottom - selected.top + 1;
}

function runGenerator(args: readonly string[]): string {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath === undefined
    ? (process.platform === "win32" ? "pnpm.cmd" : "pnpm")
    : process.execPath;
  const commandArgs = npmExecPath === undefined
    ? ["generate:spritesheet", "--", ...args]
    : [npmExecPath, "generate:spritesheet", "--", ...args];

  const result = spawnSync(command, commandArgs, {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    stdio: "pipe",
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  if (result.status !== 0 || result.error !== undefined) {
    const details = [result.error, stdout, stderr]
      .filter(Boolean)
      .map(String)
      .join("\n")
      .trim();
    throw new Error(`Spritesheet generation failed.${details.length > 0 ? `\n${details}` : ""}`);
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

const referenceHeight = measureCalibrationFrameHeight(reference, referenceFrameCount, referenceFrame);
console.log(`[${weaponId}] reference=${basename(reference)} frame=${String(referenceFrame)} targetHeight=${String(referenceHeight)}px`);

const generated: GeneratedAsset[] = [];
for (const animation of ANIMATIONS) {
  const source = findAnimationSource(sourceDir, weaponId, animation);
  if (source === undefined) continue;

  const calibrationFrame = getIntegerArg(`--${animation}-calibration-frame`, globalCalibrationFrame);
  const sourceHeight = measureCalibrationFrameHeight(source, frameCount, calibrationFrame);
  const scale = referenceHeight / sourceHeight;
  if (!Number.isFinite(scale) || scale <= 0 || scale < 0.4 || scale > 2.5) {
    throw new Error(`Unsafe scale ${scale.toFixed(4)} for ${basename(source)}: target=${String(referenceHeight)}px source=${String(sourceHeight)}px`);
  }

  const output = resolve(outputDir, `hero-${weaponId}-${animation}-sheet-v1.png`);
  console.log(`\n[${weaponId}] ${animation}: ${basename(source)} -> ${basename(output)} target=${String(referenceHeight)}px source=${String(sourceHeight)}px scale=${scale.toFixed(4)}`);
  const stdout = runGenerator([
    `--input=${toRepoRelative(source)}`,
    `--reference=${toRepoRelative(reference)}`,
    `--reference-frame=${String(referenceFrame)}`,
    `--reference-frame-count=${String(referenceFrameCount)}`,
    `--output=${toRepoRelative(output)}`,
    `--frame-count=${String(frameCount)}`,
    `--calibration-frame=${String(calibrationFrame)}`,
    `--scale=${String(scale)}`,
  ]);

  generated.push({
    animation,
    source: toRepoRelative(source),
    output: toRepoRelative(output),
    frameCount,
    calibrationFrame,
    referenceHeight,
    sourceHeight,
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
  schemaVersion: 4,
  weaponId,
  sourceDir: toRepoRelative(sourceDir),
  reference: toRepoRelative(reference),
  referenceFrame,
  referenceFrameCount,
  referenceHeight,
  generated,
};
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf-8");

console.log(`\nGenerated ${String(generated.length)} spritesheet(s).`);
console.log(`Target character height: ${String(referenceHeight)}px from reference frame ${String(referenceFrame)}.`);
console.log(`Assets: ${generated.map((entry) => entry.output).join(", ")}`);
console.log(`Report: ${toRepoRelative(reportPath)}`);
console.log("Next step: visual validation before game wiring.");
