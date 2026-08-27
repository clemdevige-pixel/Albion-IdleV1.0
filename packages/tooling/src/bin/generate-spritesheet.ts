import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { deflateSync, inflateSync } from "node:zlib";

const REPO_ROOT = resolve(import.meta.dirname, "../../../..");
const TEMP_ROOT = resolve(REPO_ROOT, ".tmp/spritesheet-generator");
const SHARP_CLI = "sharp-cli@6.0.0";
const DEFAULT_MIN_GAP = 64;
const DEFAULT_ALPHA_THRESHOLD = 8;
const DEFAULT_EDGE_PADDING = 8;

interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface BodyMetrics {
  readonly coreTop: number;
  readonly coreBottom: number;
  readonly coreHeight: number;
  readonly rootX: number;
  readonly groundY: number;
}

interface PreparedFrame {
  readonly image: RgbaImage;
  readonly metrics: BodyMetrics;
}

function getArgValue(name: string): string | undefined {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (exact !== undefined) return exact.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function getRequiredPath(name: string): string {
  const raw = getArgValue(name)?.trim();
  if (raw === undefined || raw.length === 0) {
    throw new Error(`Missing required ${name}=<path>`);
  }
  const path = resolve(REPO_ROOT, raw);
  if (!existsSync(path)) throw new Error(`${name} does not exist: ${path}`);
  return path;
}

function getNumberArg(name: string, fallback: number): number {
  const raw = getArgValue(name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Invalid ${name}: ${raw}`);
  return value;
}

function runSharp(args: readonly string[], context: string): void {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath === undefined
    ? (process.platform === "win32" ? "pnpm.cmd" : "pnpm")
    : process.execPath;
  const commandArgs = npmExecPath === undefined
    ? ["dlx", SHARP_CLI, ...args]
    : [npmExecPath, "dlx", SHARP_CLI, ...args];
  const result = spawnSync(command, commandArgs, {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    const details = [result.error, result.stdout, result.stderr]
      .filter(Boolean)
      .map(String)
      .join("\n")
      .trim();
    throw new Error(`Failed to ${context}${details.length > 0 ? `\n${details}` : ""}`);
  }
}

function normalizeToRgbaPng(source: string, output: string): void {
  mkdirSync(dirname(output), { recursive: true });
  runSharp([
    "-i", source,
    "-o", dirname(output),
    "-f", "png",
    "ensureAlpha", "1",
  ], `normalize ${basename(source)}`);
  const generated = resolve(dirname(output), `${basename(source, extname(source))}.png`);
  if (generated !== output) {
    writeFileSync(output, readFileSync(generated));
    rmSync(generated, { force: true });
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

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) === 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return chunk;
}

function writeRgbaPng(file: string, image: RgbaImage): void {
  const stride = image.width * 4;
  const raw = Buffer.alloc((stride + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) {
    const targetOffset = y * (stride + 1);
    raw[targetOffset] = 0;
    Buffer.from(image.data.buffer, image.data.byteOffset + (y * stride), stride)
      .copy(raw, targetOffset + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(image.width, 0);
  ihdr.writeUInt32BE(image.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const output = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, output);
}

function alphaAt(image: RgbaImage, x: number, y: number): number {
  return image.data[((y * image.width + x) * 4) + 3] ?? 0;
}

function findBounds(image: RgbaImage, threshold: number): Bounds {
  let left = image.width;
  let top = image.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (alphaAt(image, x, y) <= threshold) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) throw new Error("Image contains no visible pixels");
  return { left, top, right, bottom };
}

function crop(image: RgbaImage, bounds: Bounds): RgbaImage {
  const width = bounds.right - bounds.left + 1;
  const height = bounds.bottom - bounds.top + 1;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceStart = (((bounds.top + y) * image.width) + bounds.left) * 4;
    const sourceEnd = sourceStart + (width * 4);
    data.set(image.data.subarray(sourceStart, sourceEnd), y * width * 4);
  }
  return { width, height, data };
}

function resizeNearest(image: RgbaImage, scale: number): RgbaImage {
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(image.height - 1, Math.floor(y / scale));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.floor(x / scale));
      const sourceIndex = (sourceY * image.width + sourceX) * 4;
      const targetIndex = (y * width + x) * 4;
      data[targetIndex] = image.data[sourceIndex] ?? 0;
      data[targetIndex + 1] = image.data[sourceIndex + 1] ?? 0;
      data[targetIndex + 2] = image.data[sourceIndex + 2] ?? 0;
      data[targetIndex + 3] = image.data[sourceIndex + 3] ?? 0;
    }
  }
  return { width, height, data };
}

function weightedMedian(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function measureBody(image: RgbaImage, threshold: number): BodyMetrics {
  const bounds = findBounds(image, threshold);
  const opaqueX: number[] = [];
  for (let y = bounds.top; y <= bounds.bottom; y += 1) {
    for (let x = bounds.left; x <= bounds.right; x += 1) {
      if (alphaAt(image, x, y) > threshold) opaqueX.push(x);
    }
  }
  const medianX = weightedMedian(opaqueX);
  const bboxWidth = bounds.right - bounds.left + 1;
  const bandHalfWidth = Math.max(4, Math.round(bboxWidth * 0.28));
  const bandLeft = Math.max(bounds.left, medianX - bandHalfWidth);
  const bandRight = Math.min(bounds.right, medianX + bandHalfWidth);
  const rowCounts = new Array<number>(image.height).fill(0);
  let maxRowCount = 0;
  for (let y = bounds.top; y <= bounds.bottom; y += 1) {
    let count = 0;
    for (let x = bandLeft; x <= bandRight; x += 1) {
      if (alphaAt(image, x, y) > threshold) count += 1;
    }
    rowCounts[y] = count;
    maxRowCount = Math.max(maxRowCount, count);
  }
  const meaningfulRowCount = Math.max(2, Math.round(maxRowCount * 0.16));
  let coreTop = bounds.top;
  let coreBottom = bounds.bottom;
  for (let y = bounds.top; y <= bounds.bottom; y += 1) {
    if ((rowCounts[y] ?? 0) >= meaningfulRowCount) {
      coreTop = y;
      break;
    }
  }
  for (let y = bounds.bottom; y >= bounds.top; y -= 1) {
    if ((rowCounts[y] ?? 0) >= meaningfulRowCount) {
      coreBottom = y;
      break;
    }
  }
  const coreHeight = Math.max(1, coreBottom - coreTop + 1);
  const lowerStart = Math.round(coreTop + (coreHeight * 0.65));
  const rootXs: number[] = [];
  for (let y = lowerStart; y <= coreBottom; y += 1) {
    for (let x = bandLeft; x <= bandRight; x += 1) {
      if (alphaAt(image, x, y) > threshold) rootXs.push(x);
    }
  }
  const rootX = rootXs.length > 0 ? weightedMedian(rootXs) : medianX;
  return { coreTop, coreBottom, coreHeight, rootX, groundY: coreBottom };
}

function splitFrames(sheet: RgbaImage, threshold: number, minGap: number): RgbaImage[] {
  const occupiedColumns = new Array<boolean>(sheet.width).fill(false);
  for (let x = 0; x < sheet.width; x += 1) {
    for (let y = 0; y < sheet.height; y += 1) {
      if (alphaAt(sheet, x, y) > threshold) {
        occupiedColumns[x] = true;
        break;
      }
    }
  }

  const separators: Array<{ start: number; end: number }> = [];
  let runStart: number | undefined;
  for (let x = 0; x <= sheet.width; x += 1) {
    const occupied = x < sheet.width ? (occupiedColumns[x] ?? false) : true;
    if (!occupied && runStart === undefined) runStart = x;
    if (occupied && runStart !== undefined) {
      const runLength = x - runStart;
      if (runLength >= minGap) separators.push({ start: runStart, end: x - 1 });
      runStart = undefined;
    }
  }

  const ranges: Array<{ left: number; right: number }> = [];
  let left = 0;
  for (const separator of separators) {
    const right = separator.start - 1;
    if (right >= left) ranges.push({ left, right });
    left = separator.end + 1;
  }
  if (left < sheet.width) ranges.push({ left, right: sheet.width - 1 });

  const frames: RgbaImage[] = [];
  for (const range of ranges) {
    let contentLeft = range.right + 1;
    let contentRight = range.left - 1;
    for (let x = range.left; x <= range.right; x += 1) {
      if (occupiedColumns[x]) {
        contentLeft = Math.min(contentLeft, x);
        contentRight = Math.max(contentRight, x);
      }
    }
    if (contentRight < contentLeft) continue;
    const horizontalCrop = crop(sheet, {
      left: contentLeft,
      right: contentRight,
      top: 0,
      bottom: sheet.height - 1,
    });
    frames.push(crop(horizontalCrop, findBounds(horizontalCrop, threshold)));
  }
  if (frames.length === 0) throw new Error("No sprite frames detected");
  return frames;
}

function blit(target: RgbaImage, source: RgbaImage, left: number, top: number): void {
  for (let y = 0; y < source.height; y += 1) {
    const targetY = top + y;
    if (targetY < 0 || targetY >= target.height) continue;
    for (let x = 0; x < source.width; x += 1) {
      const targetX = left + x;
      if (targetX < 0 || targetX >= target.width) continue;
      const sourceIndex = (y * source.width + x) * 4;
      const alpha = source.data[sourceIndex + 3] ?? 0;
      if (alpha === 0) continue;
      const targetIndex = (targetY * target.width + targetX) * 4;
      target.data[targetIndex] = source.data[sourceIndex] ?? 0;
      target.data[targetIndex + 1] = source.data[sourceIndex + 1] ?? 0;
      target.data[targetIndex + 2] = source.data[sourceIndex + 2] ?? 0;
      target.data[targetIndex + 3] = alpha;
    }
  }
}

const input = getRequiredPath("--input");
const reference = getRequiredPath("--reference");
const outputRaw = getArgValue("--output")?.trim();
const output = outputRaw === undefined || outputRaw.length === 0
  ? resolve(dirname(input), `${basename(input, extname(input))}-normalized.png`)
  : resolve(REPO_ROOT, outputRaw);
const minGap = Math.max(1, Math.round(getNumberArg("--min-gap", DEFAULT_MIN_GAP)));
const alphaThreshold = Math.max(0, Math.min(254, Math.round(getNumberArg("--alpha-threshold", DEFAULT_ALPHA_THRESHOLD))));
const edgePadding = Math.max(0, Math.round(getNumberArg("--edge-padding", DEFAULT_EDGE_PADDING)));
const calibrationFrame = Math.max(0, Math.round(getNumberArg("--calibration-frame", 0)));
const referenceFrame = Math.max(0, Math.round(getNumberArg("--reference-frame", 0)));
const expectedFrameCountRaw = getArgValue("--frame-count");
const expectedFrameCount = expectedFrameCountRaw === undefined ? undefined : Number(expectedFrameCountRaw);
const requestedScaleRaw = getArgValue("--scale");
const requestedScale = requestedScaleRaw === undefined ? undefined : Number(requestedScaleRaw);

if (expectedFrameCount !== undefined && (!Number.isInteger(expectedFrameCount) || expectedFrameCount <= 0)) {
  throw new Error(`Invalid --frame-count: ${expectedFrameCountRaw}`);
}
if (requestedScale !== undefined && (!Number.isFinite(requestedScale) || requestedScale <= 0)) {
  throw new Error(`Invalid --scale: ${requestedScaleRaw}`);
}

rmSync(TEMP_ROOT, { recursive: true, force: true });
mkdirSync(TEMP_ROOT, { recursive: true });
const normalizedInput = resolve(TEMP_ROOT, "input.png");
const normalizedReference = resolve(TEMP_ROOT, "reference.png");
normalizeToRgbaPng(input, normalizedInput);
normalizeToRgbaPng(reference, normalizedReference);

const sourceSheet = readRgbaPng(normalizedInput);
const referenceSheet = readRgbaPng(normalizedReference);
const frames = splitFrames(sourceSheet, alphaThreshold, minGap);
const referenceFrames = splitFrames(referenceSheet, alphaThreshold, minGap);
if (expectedFrameCount !== undefined && frames.length !== expectedFrameCount) {
  throw new Error(`Detected ${String(frames.length)} frames, expected ${String(expectedFrameCount)}`);
}
if (calibrationFrame >= frames.length) {
  throw new Error(`--calibration-frame=${String(calibrationFrame)} is outside detected frame range 0..${String(frames.length - 1)}`);
}
if (referenceFrame >= referenceFrames.length) {
  throw new Error(`--reference-frame=${String(referenceFrame)} is outside detected reference frame range 0..${String(referenceFrames.length - 1)}`);
}

const referenceImage = referenceFrames[referenceFrame] as RgbaImage;
const calibrationImage = frames[calibrationFrame] as RgbaImage;
const referenceMetrics = measureBody(referenceImage, alphaThreshold);
const calibrationMetrics = measureBody(calibrationImage, alphaThreshold);
const automaticScale = referenceMetrics.coreHeight / calibrationMetrics.coreHeight;
const scale = requestedScale ?? automaticScale;
if (!Number.isFinite(scale) || scale <= 0 || scale < 0.4 || scale > 2.5) {
  throw new Error(`Unsafe spritesheet scale ${scale.toFixed(4)}; pass --scale explicitly if this is intentional`);
}

const prepared: PreparedFrame[] = frames.map((frame) => {
  const image = resizeNearest(frame, scale);
  return { image, metrics: measureBody(image, alphaThreshold) };
});

let maxLeftExtent = 0;
let maxRightExtent = 0;
let maxAboveGround = 0;
let maxBelowGround = 0;
for (const frame of prepared) {
  maxLeftExtent = Math.max(maxLeftExtent, frame.metrics.rootX);
  maxRightExtent = Math.max(maxRightExtent, frame.image.width - 1 - frame.metrics.rootX);
  maxAboveGround = Math.max(maxAboveGround, frame.metrics.groundY);
  maxBelowGround = Math.max(maxBelowGround, frame.image.height - 1 - frame.metrics.groundY);
}

const halfGap = Math.ceil(minGap / 2);
const cellWidth = maxLeftExtent + maxRightExtent + 1 + minGap;
const frameHeight = edgePadding + maxAboveGround + maxBelowGround + 1 + edgePadding;
const baselineY = edgePadding + maxAboveGround;
const anchorX = halfGap + maxLeftExtent;
const sheetWidth = cellWidth * prepared.length;
const outputImage: RgbaImage = {
  width: sheetWidth,
  height: frameHeight,
  data: new Uint8Array(sheetWidth * frameHeight * 4),
};

prepared.forEach((frame, index) => {
  const left = (index * cellWidth) + anchorX - frame.metrics.rootX;
  const top = baselineY - frame.metrics.groundY;
  blit(outputImage, frame.image, left, top);
});

writeRgbaPng(output, outputImage);
rmSync(TEMP_ROOT, { recursive: true, force: true });

console.log(`spritesheet input=${input}`);
console.log(`reference=${reference}`);
console.log(`frames=${String(prepared.length)} calibration=${String(calibrationFrame)}`);
console.log(`referenceFrames=${String(referenceFrames.length)} referenceFrame=${String(referenceFrame)}`);
console.log(`referenceCoreHeight=${String(referenceMetrics.coreHeight)} calibrationCoreHeight=${String(calibrationMetrics.coreHeight)}`);
console.log(`scale=${scale.toFixed(4)}${requestedScale === undefined ? " (auto)" : " (manual)"}`);
console.log(`cell=${String(cellWidth)}x${String(frameHeight)} baselineY=${String(baselineY)} minGap=${String(minGap)}`);
console.log(`generated ${output}`);
