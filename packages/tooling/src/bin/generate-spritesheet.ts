import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { deflateSync, inflateSync } from "node:zlib";

const REPO_ROOT = resolve(import.meta.dirname, "../../../..");
const TEMP_ROOT = resolve(REPO_ROOT, ".tmp/spritesheet-generator");
const SHARP_CLI = "sharp-cli@6.0.0";
const DEFAULT_MIN_GAP = 64;
const DEFAULT_OUTPUT_GAP = 64;
const DEFAULT_ALPHA_THRESHOLD = 8;
const DEFAULT_EDGE_PADDING = 8;

type RgbaImage = {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
};

type Bounds = {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
};

type Component = {
  readonly id: number;
  readonly area: number;
  readonly centerX: number;
  readonly bounds: Bounds;
};

type ComponentMap = {
  readonly labels: Int32Array;
  readonly components: readonly Component[];
};

type SplitOptions = {
  readonly fallbackMinGap: number;
  readonly expectedCount?: number;
};

type BodyMetrics = {
  readonly top: number;
  readonly bottom: number;
  readonly height: number;
};

function getArgValue(name: string): string | undefined {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (exact !== undefined) return exact.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function getRequiredPath(name: string): string {
  const raw = getArgValue(name)?.trim();
  if (raw === undefined || raw.length === 0) throw new Error(`Missing required ${name}=<path>`);
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
  runSharp(["-i", source, "-o", dirname(output), "-f", "png", "ensureAlpha", "1"], `normalize ${basename(source)}`);
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
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!png.subarray(0, 8).equals(signature)) throw new Error(`Not a PNG: ${file}`);

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

  const stride = width * 4;
  const raw = inflateSync(Buffer.concat(idat));
  const pixels = new Uint8Array(width * height * 4);
  let rawOffset = 0;
  const previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset] ?? 0;
    rawOffset += 1;
    const row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x += 1) {
      const source = raw[rawOffset + x] ?? 0;
      const left = x >= 4 ? (row[x - 4] ?? 0) : 0;
      const up = previous[x] ?? 0;
      const upLeft = x >= 4 ? (previous[x - 4] ?? 0) : 0;
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
    Buffer.from(image.data.buffer, image.data.byteOffset + (y * stride), stride).copy(raw, targetOffset + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(image.width, 0);
  ihdr.writeUInt32BE(image.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

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

function findPixelComponents(sheet: RgbaImage, threshold: number): ComponentMap {
  const labels = new Int32Array(sheet.width * sheet.height);
  labels.fill(-1);
  const components: Component[] = [];
  const queue = new Int32Array(sheet.width * sheet.height);
  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1],
  ] as const;

  for (let y = 0; y < sheet.height; y += 1) {
    for (let x = 0; x < sheet.width; x += 1) {
      const index = (y * sheet.width) + x;
      if (labels[index] !== -1) continue;
      if (alphaAt(sheet, x, y) <= threshold) {
        labels[index] = -2;
        continue;
      }

      const id = components.length;
      let head = 0;
      let tail = 0;
      queue[tail] = index;
      tail += 1;
      labels[index] = id;

      let area = 0;
      let sumX = 0;
      let left = x;
      let right = x;
      let top = y;
      let bottom = y;

      while (head < tail) {
        const current = queue[head] ?? 0;
        head += 1;
        const currentX = current % sheet.width;
        const currentY = Math.floor(current / sheet.width);
        area += 1;
        sumX += currentX;
        left = Math.min(left, currentX);
        right = Math.max(right, currentX);
        top = Math.min(top, currentY);
        bottom = Math.max(bottom, currentY);

        for (const [dx, dy] of neighbors) {
          const nextX = currentX + dx;
          const nextY = currentY + dy;
          if (nextX < 0 || nextX >= sheet.width || nextY < 0 || nextY >= sheet.height) continue;
          const nextIndex = (nextY * sheet.width) + nextX;
          if (labels[nextIndex] !== -1) continue;
          if (alphaAt(sheet, nextX, nextY) <= threshold) {
            labels[nextIndex] = -2;
            continue;
          }
          labels[nextIndex] = id;
          queue[tail] = nextIndex;
          tail += 1;
        }
      }

      components.push({
        id,
        area,
        centerX: sumX / Math.max(1, area),
        bounds: { left, top, right, bottom },
      });
    }
  }

  return { labels, components };
}

function clusterComponents(components: readonly Component[], sheetWidth: number, frameCount: number): number[] {
  if (components.length < frameCount) {
    throw new Error(`Only ${String(components.length)} opaque components found; cannot resolve ${String(frameCount)} frames`);
  }

  let centers = Array.from({ length: frameCount }, (_, index) => ((index + 0.5) * sheetWidth) / frameCount);
  const assignments = new Array<number>(components.length).fill(0);

  for (let iteration = 0; iteration < 16; iteration += 1) {
    for (let componentIndex = 0; componentIndex < components.length; componentIndex += 1) {
      const component = components[componentIndex];
      if (component === undefined) continue;
      let bestCluster = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let cluster = 0; cluster < centers.length; cluster += 1) {
        const distance = Math.abs(component.centerX - (centers[cluster] ?? 0));
        if (distance < bestDistance) {
          bestDistance = distance;
          bestCluster = cluster;
        }
      }
      assignments[componentIndex] = bestCluster;
    }

    const weightedX = new Array<number>(frameCount).fill(0);
    const weights = new Array<number>(frameCount).fill(0);
    for (let componentIndex = 0; componentIndex < components.length; componentIndex += 1) {
      const component = components[componentIndex];
      if (component === undefined) continue;
      const cluster = assignments[componentIndex] ?? 0;
      const weight = Math.max(1, component.area);
      weightedX[cluster] = (weightedX[cluster] ?? 0) + (component.centerX * weight);
      weights[cluster] = (weights[cluster] ?? 0) + weight;
    }
    centers = centers.map((previous, cluster) => {
      const weight = weights[cluster] ?? 0;
      return weight > 0 ? (weightedX[cluster] ?? 0) / weight : previous;
    });
  }

  const order = centers
    .map((center, cluster) => ({ center, cluster }))
    .sort((a, b) => a.center - b.center);
  const remap = new Map<number, number>();
  order.forEach((entry, index) => remap.set(entry.cluster, index));
  return assignments.map((cluster) => remap.get(cluster) ?? cluster);
}

function buildComponentFrames(sheet: RgbaImage, threshold: number, frameCount: number): RgbaImage[] {
  const componentMap = findPixelComponents(sheet, threshold);
  const assignments = clusterComponents(componentMap.components, sheet.width, frameCount);
  const horizontalBounds: Array<{ left: number; right: number } | undefined> = Array.from(
    { length: frameCount },
    () => undefined,
  );

  for (let componentIndex = 0; componentIndex < componentMap.components.length; componentIndex += 1) {
    const component = componentMap.components[componentIndex];
    const cluster = assignments[componentIndex];
    if (component === undefined || cluster === undefined) continue;
    const current = horizontalBounds[cluster];
    horizontalBounds[cluster] = current === undefined
      ? { left: component.bounds.left, right: component.bounds.right }
      : {
          left: Math.min(current.left, component.bounds.left),
          right: Math.max(current.right, component.bounds.right),
        };
  }

  const frames: RgbaImage[] = [];
  for (let cluster = 0; cluster < frameCount; cluster += 1) {
    const bounds = horizontalBounds[cluster];
    if (bounds === undefined) throw new Error(`No opaque component assigned to frame ${String(cluster)}`);
    const width = bounds.right - bounds.left + 1;
    const height = sheet.height;
    const data = new Uint8Array(width * height * 4);

    for (let y = 0; y < sheet.height; y += 1) {
      for (let x = bounds.left; x <= bounds.right; x += 1) {
        const sourcePixel = (y * sheet.width) + x;
        const componentId = componentMap.labels[sourcePixel] ?? -1;
        if (componentId < 0 || assignments[componentId] !== cluster || alphaAt(sheet, x, y) <= threshold) continue;
        const sourceIndex = sourcePixel * 4;
        const targetIndex = ((y * width) + (x - bounds.left)) * 4;
        data[targetIndex] = sheet.data[sourceIndex] ?? 0;
        data[targetIndex + 1] = sheet.data[sourceIndex + 1] ?? 0;
        data[targetIndex + 2] = sheet.data[sourceIndex + 2] ?? 0;
        data[targetIndex + 3] = sheet.data[sourceIndex + 3] ?? 0;
      }
    }

    frames.push({ width, height, data });
  }

  return frames;
}

function buildGapFrames(sheet: RgbaImage, threshold: number, minGap: number): RgbaImage[] {
  const occupied = new Array<boolean>(sheet.width).fill(false);
  for (let x = 0; x < sheet.width; x += 1) {
    for (let y = 0; y < sheet.height; y += 1) {
      if (alphaAt(sheet, x, y) > threshold) {
        occupied[x] = true;
        break;
      }
    }
  }

  const separators: Array<{ start: number; end: number }> = [];
  let start: number | undefined;
  for (let x = 0; x <= occupied.length; x += 1) {
    const isOccupied = x < occupied.length ? (occupied[x] ?? false) : true;
    if (!isOccupied && start === undefined) start = x;
    if (isOccupied && start !== undefined) {
      const end = x - 1;
      if (start > 0 && end < occupied.length - 1 && end - start + 1 >= minGap) {
        separators.push({ start, end });
      }
      start = undefined;
    }
  }

  const ranges: Array<{ left: number; right: number }> = [];
  let left = 0;
  for (const separator of separators) {
    if (separator.start - 1 >= left) ranges.push({ left, right: separator.start - 1 });
    left = separator.end + 1;
  }
  if (left < sheet.width) ranges.push({ left, right: sheet.width - 1 });

  const frames: RgbaImage[] = [];
  for (const range of ranges) {
    let contentLeft = range.right + 1;
    let contentRight = range.left - 1;
    for (let x = range.left; x <= range.right; x += 1) {
      if (occupied[x]) {
        contentLeft = Math.min(contentLeft, x);
        contentRight = Math.max(contentRight, x);
      }
    }
    if (contentRight < contentLeft) continue;

    const width = contentRight - contentLeft + 1;
    const data = new Uint8Array(width * sheet.height * 4);
    for (let y = 0; y < sheet.height; y += 1) {
      const sourceStart = ((y * sheet.width) + contentLeft) * 4;
      data.set(sheet.data.subarray(sourceStart, sourceStart + (width * 4)), y * width * 4);
    }
    frames.push({ width, height: sheet.height, data });
  }

  if (frames.length === 0) throw new Error("No sprite frames detected");
  return frames;
}

function splitFrames(sheet: RgbaImage, threshold: number, options: SplitOptions): RgbaImage[] {
  const frames = options.expectedCount === undefined
    ? buildGapFrames(sheet, threshold, options.fallbackMinGap)
    : buildComponentFrames(sheet, threshold, options.expectedCount);
  if (options.expectedCount !== undefined && frames.length !== options.expectedCount) {
    throw new Error(`Detected ${String(frames.length)} frames, expected ${String(options.expectedCount)}`);
  }
  return frames;
}

function measureBody(frame: RgbaImage, threshold: number): BodyMetrics {
  const bounds = findBounds(frame, threshold);
  return {
    top: bounds.top,
    bottom: bounds.bottom,
    height: bounds.bottom - bounds.top + 1,
  };
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
const outputGap = Math.max(1, Math.round(getNumberArg("--output-gap", DEFAULT_OUTPUT_GAP)));
const alphaThreshold = Math.max(0, Math.min(254, Math.round(getNumberArg("--alpha-threshold", DEFAULT_ALPHA_THRESHOLD))));
const edgePadding = Math.max(0, Math.round(getNumberArg("--edge-padding", DEFAULT_EDGE_PADDING)));
const calibrationFrame = Math.max(0, Math.round(getNumberArg("--calibration-frame", 0)));
const referenceFrame = Math.max(0, Math.round(getNumberArg("--reference-frame", 0)));
const expectedCountRaw = getArgValue("--frame-count");
const expectedCount = expectedCountRaw === undefined ? undefined : Number(expectedCountRaw);
const referenceCountRaw = getArgValue("--reference-frame-count");
const referenceCount = referenceCountRaw === undefined ? undefined : Number(referenceCountRaw);
const manualScaleRaw = getArgValue("--scale");
const manualScale = manualScaleRaw === undefined ? undefined : Number(manualScaleRaw);

if (expectedCount !== undefined && (!Number.isInteger(expectedCount) || expectedCount <= 0)) {
  throw new Error(`Invalid --frame-count: ${expectedCountRaw}`);
}
if (referenceCount !== undefined && (!Number.isInteger(referenceCount) || referenceCount <= 0)) {
  throw new Error(`Invalid --reference-frame-count: ${referenceCountRaw}`);
}
if (manualScale !== undefined && (!Number.isFinite(manualScale) || manualScale <= 0)) {
  throw new Error(`Invalid --scale: ${manualScaleRaw}`);
}

rmSync(TEMP_ROOT, { recursive: true, force: true });
mkdirSync(TEMP_ROOT, { recursive: true });
const normalizedInput = resolve(TEMP_ROOT, "input.png");
const normalizedReference = resolve(TEMP_ROOT, "reference.png");
normalizeToRgbaPng(input, normalizedInput);
normalizeToRgbaPng(reference, normalizedReference);

const sourceSheet = readRgbaPng(normalizedInput);
const referenceSheet = readRgbaPng(normalizedReference);
const frames = splitFrames(
  sourceSheet,
  alphaThreshold,
  expectedCount === undefined
    ? { fallbackMinGap: minGap }
    : { fallbackMinGap: minGap, expectedCount },
);
const referenceFrames = splitFrames(
  referenceSheet,
  alphaThreshold,
  referenceCount === undefined
    ? { fallbackMinGap: minGap }
    : { fallbackMinGap: minGap, expectedCount: referenceCount },
);

if (calibrationFrame >= frames.length) {
  throw new Error(`--calibration-frame=${String(calibrationFrame)} outside range 0..${String(frames.length - 1)}`);
}
if (referenceFrame >= referenceFrames.length) {
  throw new Error(`--reference-frame=${String(referenceFrame)} outside range 0..${String(referenceFrames.length - 1)}`);
}

const referenceMetrics = measureBody(referenceFrames[referenceFrame] as RgbaImage, alphaThreshold);
const calibrationMetrics = measureBody(frames[calibrationFrame] as RgbaImage, alphaThreshold);
const automaticScale = referenceMetrics.height / calibrationMetrics.height;
const scale = manualScale ?? automaticScale;
if (!Number.isFinite(scale) || scale <= 0 || scale < 0.4 || scale > 2.5) {
  throw new Error(`Unsafe spritesheet scale ${scale.toFixed(4)}`);
}

const scaledFrames = frames.map((frame) => resizeNearest(frame, scale));
const scaledBounds = scaledFrames.map((frame) => findBounds(frame, alphaThreshold));
const scaledCalibrationMetrics = measureBody(scaledFrames[calibrationFrame] as RgbaImage, alphaThreshold);
const minVisibleY = Math.min(...scaledBounds.map((bounds) => bounds.top));
const maxVisibleY = Math.max(...scaledBounds.map((bounds) => bounds.bottom));
const verticalOffset = edgePadding - minVisibleY;
const frameHeight = edgePadding + (maxVisibleY - minVisibleY + 1) + edgePadding;
const baselineY = verticalOffset + scaledCalibrationMetrics.bottom;

const maxVisibleWidth = Math.max(...scaledBounds.map((bounds) => bounds.right - bounds.left + 1));
const cellWidth = maxVisibleWidth + outputGap;
const sheetWidth = cellWidth * scaledFrames.length;
const outputImage: RgbaImage = {
  width: sheetWidth,
  height: frameHeight,
  data: new Uint8Array(sheetWidth * frameHeight * 4),
};

scaledFrames.forEach((frame, index) => {
  const bounds = scaledBounds[index] as Bounds;
  const visibleWidth = bounds.right - bounds.left + 1;
  const targetVisibleLeft = (index * cellWidth) + Math.floor((cellWidth - visibleWidth) / 2);
  const drawLeft = targetVisibleLeft - bounds.left;
  blit(outputImage, frame, drawLeft, verticalOffset);
});

writeRgbaPng(output, outputImage);
rmSync(TEMP_ROOT, { recursive: true, force: true });

console.log(`spritesheet input=${input}`);
console.log(`reference=${reference}`);
console.log(`frames=${String(scaledFrames.length)} calibration=${String(calibrationFrame)} detection=${expectedCount === undefined ? `gap>=${String(minGap)}` : `components(${String(expectedCount)})`}`);
console.log(`referenceFrames=${String(referenceFrames.length)} referenceFrame=${String(referenceFrame)}`);
console.log(`referenceBodyHeight=${String(referenceMetrics.height)} calibrationBodyHeight=${String(calibrationMetrics.height)}`);
console.log(`scale=${scale.toFixed(4)}${manualScale === undefined ? " (auto)" : " (manual)"}`);
console.log(`cell=${String(cellWidth)}x${String(frameHeight)} baselineY=${String(baselineY)} outputGap=${String(outputGap)}`);
console.log("sizeMode=strict-visible-height");
console.log("verticalMode=preserve-source-y");
console.log(`generated ${output}`);
