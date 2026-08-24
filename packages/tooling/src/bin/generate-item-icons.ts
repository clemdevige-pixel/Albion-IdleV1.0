import { mkdirSync, readdirSync, existsSync, readFileSync, rmSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { inflateSync } from "node:zlib";

const REPO_ROOT = resolve(import.meta.dirname, "../../../..");
const MASTER_ROOT = join(REPO_ROOT, "apps/client/assets/items/masters");
const LEGACY_MASTER_ROOT = join(REPO_ROOT, "apps/client/public/assets/items");
const ICON_ROOT = join(REPO_ROOT, "apps/client/public/assets/items/icons");
const TEMP_ROOT = join(REPO_ROOT, ".tmp/item-icon-generator");
const SHARP_CLI = "sharp-cli@6.0.0";
const CATEGORIES = ["armes", "equipements"] as const;
const ICON_SIZE = 128;
const MAX_VISIBLE_EXTENT = 120;
const MIN_VISIBLE_EXTENT = 88;
const TARGET_ALPHA_DENSITY = 0.28;
const MIN_EDGE_MARGIN = 2;

interface AlphaMetrics {
  readonly width: number;
  readonly height: number;
  readonly density: number;
  readonly centroidX: number;
  readonly centroidY: number;
}

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

function runSharp(args: readonly string[], context: string): void {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath === undefined ? (process.platform === "win32" ? "pnpm.cmd" : "pnpm") : process.execPath;
  const commandArgs = npmExecPath === undefined
    ? ["dlx", SHARP_CLI, ...args]
    : [npmExecPath, "dlx", SHARP_CLI, ...args];

  const result = spawnSync(command, commandArgs, {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    const systemError = result.error === undefined ? "" : String(result.error);
    const details = [systemError, result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`Failed to ${context}${details.length > 0 ? `\n${details}` : ""}`);
  }
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

function readRgbaAlphaMetrics(file: string): AlphaMetrics {
  const png = readFileSync(file);
  const signature = png.subarray(0, 8);
  const expected = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!signature.equals(expected)) throw new Error(`Generated intermediate is not a PNG: ${file}`);

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
    throw new Error(`Unsupported intermediate PNG format for ${file}`);
  }

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const raw = inflateSync(Buffer.concat(idat));
  const previous = Buffer.alloc(stride);
  let rawOffset = 0;
  let opaqueCount = 0;
  let weightedX = 0;
  let weightedY = 0;
  let alphaTotal = 0;

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

    for (let px = 0; px < width; px += 1) {
      const alpha = row[(px * bytesPerPixel) + 3] ?? 0;
      if (alpha > 0) opaqueCount += 1;
      alphaTotal += alpha;
      weightedX += px * alpha;
      weightedY += y * alpha;
    }
    row.copy(previous);
  }

  if (alphaTotal <= 0) throw new Error(`No visible pixels in ${file}`);
  return {
    width,
    height,
    density: opaqueCount / (width * height),
    centroidX: weightedX / alphaTotal,
    centroidY: weightedY / alphaTotal,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function generateIcon(source: string, outputDir: string): void {
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(TEMP_ROOT, { recursive: true });
  const tempDir = join(TEMP_ROOT, basename(source, extname(source)));
  rmSync(tempDir, { recursive: true, force: true });
  mkdirSync(tempDir, { recursive: true });

  runSharp([
    "-i", source,
    "-o", tempDir,
    "-f", "png",
    "trim", "0",
    "--",
    "ensureAlpha", "1",
  ], `prepare ${basename(source)}`);

  const trimmed = join(tempDir, basename(source));
  const metrics = readRgbaAlphaMetrics(trimmed);

  // Low-density/slender art gets the full envelope. Dense art is reduced so its
  // perceived visual mass stays comparable without ever cropping the source.
  const densityScale = Math.sqrt(TARGET_ALPHA_DENSITY / Math.max(metrics.density, 0.01));
  const targetExtent = clamp(
    Math.round(MAX_VISIBLE_EXTENT * Math.min(1, densityScale)),
    MIN_VISIBLE_EXTENT,
    MAX_VISIBLE_EXTENT,
  );
  const longest = Math.max(metrics.width, metrics.height);
  const scale = targetExtent / longest;
  const resizedWidth = Math.max(1, Math.round(metrics.width * scale));
  const resizedHeight = Math.max(1, Math.round(metrics.height * scale));

  const centroidX = metrics.centroidX * scale;
  const centroidY = metrics.centroidY * scale;
  const maxLeft = ICON_SIZE - MIN_EDGE_MARGIN - resizedWidth;
  const maxTop = ICON_SIZE - MIN_EDGE_MARGIN - resizedHeight;
  const left = clamp(Math.round((ICON_SIZE / 2) - centroidX), MIN_EDGE_MARGIN, Math.max(MIN_EDGE_MARGIN, maxLeft));
  const top = clamp(Math.round((ICON_SIZE / 2) - centroidY), MIN_EDGE_MARGIN, Math.max(MIN_EDGE_MARGIN, maxTop));
  const right = ICON_SIZE - resizedWidth - left;
  const bottom = ICON_SIZE - resizedHeight - top;

  runSharp([
    "-i", trimmed,
    "-o", outputDir,
    "-f", "png",
    "resize", String(resizedWidth), String(resizedHeight),
    "--fit", "fill",
    "--kernel", "nearest",
    "--",
    "extend", String(top), String(bottom), String(left), String(right),
    "--background", "rgba(0,0,0,0)",
  ], `frame ${basename(source)}`);

  rmSync(tempDir, { recursive: true, force: true });
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

rmSync(TEMP_ROOT, { recursive: true, force: true });
console.log(`Generated ${String(sources.length)} inventory icons.`);
