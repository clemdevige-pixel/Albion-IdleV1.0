import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const PNG_SIGNATURE_SIZE = 8;
const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 480;
const FRAME_COUNT = 6;

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function decodeRgbaPng(path: URL): { width: number; height: number; rgba: Uint8Array } {
  const png = readFileSync(path);
  let offset = PNG_SIGNATURE_SIZE;
  let width = 0;
  let height = 0;
  const idatChunks: Buffer[] = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (type === "IHDR") {
      width = png.readUInt32BE(dataStart);
      height = png.readUInt32BE(dataStart + 4);
      expect(png[dataStart + 8]).toBe(8);
      expect(png[dataStart + 9]).toBe(6);
    } else if (type === "IDAT") {
      idatChunks.push(png.subarray(dataStart, dataEnd));
    }

    offset = dataEnd + 4;
  }

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const filtered = inflateSync(Buffer.concat(idatChunks));
  const rgba = new Uint8Array(width * height * bytesPerPixel);
  let sourceOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = filtered[sourceOffset];
    sourceOffset += 1;
    const rowOffset = y * stride;

    for (let x = 0; x < stride; x += 1) {
      const raw = filtered[sourceOffset + x] ?? 0;
      const left = x >= bytesPerPixel ? rgba[rowOffset + x - bytesPerPixel] ?? 0 : 0;
      const up = y > 0 ? rgba[rowOffset - stride + x] ?? 0 : 0;
      const upLeft = y > 0 && x >= bytesPerPixel
        ? rgba[rowOffset - stride + x - bytesPerPixel] ?? 0
        : 0;

      let value: number;
      switch (filter) {
        case 0:
          value = raw;
          break;
        case 1:
          value = raw + left;
          break;
        case 2:
          value = raw + up;
          break;
        case 3:
          value = raw + Math.floor((left + up) / 2);
          break;
        case 4:
          value = raw + paethPredictor(left, up, upLeft);
          break;
        default:
          throw new Error(`Unsupported PNG filter ${String(filter)} at row ${String(y)}`);
      }
      rgba[rowOffset + x] = value & 0xff;
    }

    sourceOffset += stride;
  }

  return { width, height, rgba };
}

describe("dual dagger sprite asset", () => {
  it("contains visible alpha pixels in every authored frame", () => {
    const assetUrl = new URL(
      "../../../public/assets/characters/hero-dual-dagger-attack-sheet-v3.png",
      import.meta.url,
    );
    const image = decodeRgbaPng(assetUrl);

    expect(image.width).toBe(FRAME_WIDTH * FRAME_COUNT);
    expect(image.height).toBe(FRAME_HEIGHT);

    const visiblePixelsPerFrame = Array.from({ length: FRAME_COUNT }, (_, frameIndex) => {
      let visiblePixels = 0;
      const startX = frameIndex * FRAME_WIDTH;
      const endX = startX + FRAME_WIDTH;
      for (let y = 0; y < image.height; y += 1) {
        for (let x = startX; x < endX; x += 1) {
          const alphaIndex = (y * image.width + x) * 4 + 3;
          if ((image.rgba[alphaIndex] ?? 0) > 0) visiblePixels += 1;
        }
      }
      return visiblePixels;
    });

    for (const [frameIndex, visiblePixels] of visiblePixelsPerFrame.entries()) {
      expect(visiblePixels, `frame ${String(frameIndex)} alpha pixels`).toBeGreaterThan(0);
    }
  });
});
