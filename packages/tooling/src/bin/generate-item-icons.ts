import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { inflateSync } from "node:zlib";

const REPO_ROOT = resolve(import.meta.dirname, "../../../..");
const MASTER_ROOT = join(REPO_ROOT, "apps/client/assets/items/masters");
const LEGACY_MASTER_ROOT = join(REPO_ROOT, "apps/client/public/assets/items");
const ICON_ROOT = join(REPO_ROOT, "apps/client/public/assets/items/icons");
const FRAMING_CONFIG_FILE = join(REPO_ROOT, "apps/client/assets/items/item-icon-framing.json");
const TEMP_ROOT = join(REPO_ROOT, ".tmp/item-icon-generator");
const SHARP_CLI = "sharp-cli@6.0.0";
const ICON_SIZE = 128;
const MAX_VISIBLE_EXTENT = 120;
const MIN_VISIBLE_EXTENT = 88;
const TARGET_ALPHA_DENSITY = 0.28;
const MIN_EDGE_MARGIN = 2;

interface AlphaMetrics {
  readonly width: number;
  readonly height: number;
  readonly density: number;
}

interface SourceEntry {
  readonly source: string;
  readonly outputDir: string;
  readonly outputFile: string;
}

interface ItemIconFraming {
  readonly trimThreshold?: number;
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly scale?: number;
}

type ItemIconFramingConfig = Readonly<Record<string, ItemIconFraming>>;

function normalizeRelativePath(path: string): string {
  return path.replaceAll("\\", "/");
}

function loadFramingConfig(): ItemIconFramingConfig {
  if (!existsSync(FRAMING_CONFIG_FILE)) return {};
  const parsed = JSON.parse(readFileSync(FRAMING_CONFIG_FILE, "utf-8")) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Invalid item icon framing config: ${FRAMING_CONFIG_FILE}`);
  }
  return parsed as ItemIconFramingConfig;
}

const framingConfig = loadFramingConfig();

function getFraming(entry: SourceEntry): ItemIconFraming | undefined {
  const outputRelative = `icons/${normalizeRelativePath(relative(ICON_ROOT, entry.outputFile))}`;
  return framingConfig[outputRelative];
}

function listPngFilesRecursive(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listPngFilesRecursive(path));
    else if (entry.isFile() && extname(entry.name).toLowerCase() === ".png") files.push(path);
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function listFlatPngFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".png")
    .map((entry) => join(directory, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

function resolveCanonicalSources(): SourceEntry[] {
  return listPngFilesRecursive(MASTER_ROOT).map((source) => {
    const outputFile = join(ICON_ROOT, relative(MASTER_ROOT, source));
    return { source, outputDir: dirname(outputFile), outputFile };
  });
}

function resolveLegacyFallbackSources(canonical: readonly SourceEntry[]): SourceEntry[] {
  const canonicalOutputs = new Set(canonical.map((entry) => entry.outputFile));
  const legacyByFilename = new Map(
    listFlatPngFiles(LEGACY_MASTER_ROOT).map((source) => [basename(source), source] as const),
  );
  const fallback: SourceEntry[] = [];
  for (const existingIcon of listPngFilesRecursive(ICON_ROOT)) {
    if (canonicalOutputs.has(existingIcon)) continue;
    const source = legacyByFilename.get(basename(existingIcon));
    if (source !== undefined) fallback.push({ source, outputDir: dirname(existingIcon), outputFile: existingIcon });
  }
  return fallback;
}

function getArgValue(name: string): string | undefined {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (exact !== undefined) return exact.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const force = process.argv.includes("--force");
const only = getArgValue("--only")?.trim().toLowerCase();

function matchesOnly(entry: SourceEntry): boolean {
  if (only === undefined || only.length === 0) return true;
  const sourceRelative = normalizeRelativePath(relative(MASTER_ROOT, entry.source)).toLowerCase();
  const outputRelative = normalizeRelativePath(relative(ICON_ROOT, entry.outputFile)).toLowerCase();
  return sourceRelative.includes(only) || outputRelative.includes(only) || basename(entry.source).toLowerCase().includes(only);
}

function needsGeneration(entry: SourceEntry): boolean {
  if (force || !existsSync(entry.outputFile)) return true;
  const outputModifiedAt = statSync(entry.outputFile).mtimeMs;
  if (outputModifiedAt < statSync(entry.source).mtimeMs) return true;
  return getFraming(entry) !== undefined
    && existsSync(FRAMING_CONFIG_FILE)
    && outputModifiedAt < statSync(FRAMING_CONFIG_FILE).mtimeMs;
}

function runSharp(args: readonly string[], context: string): void {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath === undefined ? (process.platform === "win32" ? "pnpm.cmd" : "pnpm") : process.execPath;
  const commandArgs = npmExecPath === undefined ? ["dlx", SHARP_CLI, ...args] : [npmExecPath, "dlx", SHARP_CLI, ...args];
  const result = spawnSync(command, commandArgs, { cwd: REPO_ROOT, encoding: "utf-8", stdio: "pipe" });
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
  const expected = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!png.subarray(0, 8).equals(expected)) throw new Error(`Generated intermediate is not a PNG: ${file}`);

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
    } else if (type === "IDAT") idat.push(png.subarray(dataStart, dataEnd));
    else if (type === "IEND") break;
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
      if ((row[(px * bytesPerPixel) + 3] ?? 0) > 0) opaqueCount += 1;
    }
    row.copy(previous);
  }

  if (opaqueCount <= 0) throw new Error(`No visible pixels in ${file}`);
  return { width, height, density: opaqueCount / (width * height) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function generateIcon(entry: SourceEntry): void {
  mkdirSync(entry.outputDir, { recursive: true });
  mkdirSync(TEMP_ROOT, { recursive: true });
  const tempDir = join(TEMP_ROOT, basename(entry.source, extname(entry.source)));
  rmSync(tempDir, { recursive: true, force: true });
  mkdirSync(tempDir, { recursive: true });

  const framing = getFraming(entry);
  const trimThreshold = Math.round(framing?.trimThreshold ?? 0);
  if (!Number.isFinite(trimThreshold) || trimThreshold < 0 || trimThreshold > 255) {
    throw new Error(`Invalid trimThreshold for ${normalizeRelativePath(relative(ICON_ROOT, entry.outputFile))}`);
  }

  runSharp([
    "-i", entry.source,
    "-o", tempDir,
    "-f", "png",
    "trim", String(trimThreshold),
    "--",
    "ensureAlpha", "1",
  ], `prepare ${basename(entry.source)}`);

  const trimmed = join(tempDir, basename(entry.source));
  const metrics = readRgbaAlphaMetrics(trimmed);

  const densityScale = Math.sqrt(TARGET_ALPHA_DENSITY / Math.max(metrics.density, 0.01));
  const baseTargetExtent = clamp(Math.round(MAX_VISIBLE_EXTENT * Math.min(1, densityScale)), MIN_VISIBLE_EXTENT, MAX_VISIBLE_EXTENT);
  const requestedScale = framing?.scale ?? 1;
  if (!Number.isFinite(requestedScale) || requestedScale <= 0) {
    throw new Error(`Invalid framing scale for ${normalizeRelativePath(relative(ICON_ROOT, entry.outputFile))}`);
  }

  const targetExtent = clamp(Math.round(baseTargetExtent * requestedScale), 1, ICON_SIZE - (MIN_EDGE_MARGIN * 2));
  const longest = Math.max(metrics.width, metrics.height);
  const resizeScale = targetExtent / longest;
  const resizedWidth = Math.max(1, Math.round(metrics.width * resizeScale));
  const resizedHeight = Math.max(1, Math.round(metrics.height * resizeScale));

  const offsetX = Math.round(framing?.offsetX ?? 0);
  const offsetY = Math.round(framing?.offsetY ?? 0);
  const maxLeft = ICON_SIZE - MIN_EDGE_MARGIN - resizedWidth;
  const maxTop = ICON_SIZE - MIN_EDGE_MARGIN - resizedHeight;
  const left = clamp(Math.floor((ICON_SIZE - resizedWidth) / 2) + offsetX, MIN_EDGE_MARGIN, Math.max(MIN_EDGE_MARGIN, maxLeft));
  const top = clamp(Math.floor((ICON_SIZE - resizedHeight) / 2) + offsetY, MIN_EDGE_MARGIN, Math.max(MIN_EDGE_MARGIN, maxTop));
  const right = ICON_SIZE - resizedWidth - left;
  const bottom = ICON_SIZE - resizedHeight - top;

  if (framing !== undefined) {
    console.log(
      `framing ${normalizeRelativePath(relative(ICON_ROOT, entry.outputFile))}: ` +
      `trim=${trimThreshold} scale=${requestedScale} offset=(${offsetX},${offsetY}) ` +
      `box=${resizedWidth}x${resizedHeight} pos=(${left},${top})`,
    );
  }

  runSharp([
    "-i", trimmed,
    "-o", entry.outputDir,
    "-f", "png",
    "resize", String(resizedWidth), String(resizedHeight),
    "--fit", "fill",
    "--kernel", "nearest",
    "--",
    "extend", String(top), String(bottom), String(left), String(right),
    "--background", "rgba(0,0,0,0)",
  ], `frame ${basename(entry.source)}`);

  rmSync(tempDir, { recursive: true, force: true });
}

const canonicalSources = resolveCanonicalSources();
const sources = [
  ...canonicalSources,
  ...resolveLegacyFallbackSources(canonicalSources),
].sort((a, b) => a.outputFile.localeCompare(b.outputFile)).filter(matchesOnly);

if (sources.length === 0) {
  throw new Error(only === undefined
    ? `No item masters found. Drop PNG masters anywhere under ${MASTER_ROOT}.`
    : `No item master matched --only=${only}.`);
}

let generatedCount = 0;
let skippedCount = 0;
for (const entry of sources) {
  if (!needsGeneration(entry)) {
    skippedCount += 1;
    console.log(`skipped ${relative(ICON_ROOT, entry.outputFile)}`);
    continue;
  }
  generateIcon(entry);
  generatedCount += 1;
  console.log(`generated ${relative(ICON_ROOT, entry.outputFile)}`);
}

rmSync(TEMP_ROOT, { recursive: true, force: true });
console.log(`Generated ${String(generatedCount)} inventory icons; skipped ${String(skippedCount)} unchanged.`);
