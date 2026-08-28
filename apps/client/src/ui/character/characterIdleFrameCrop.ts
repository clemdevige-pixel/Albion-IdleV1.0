import type { HeroIdlePresentation } from "./characterPresentation";

export type CroppedHeroIdleFrame = {
  readonly image: string;
  readonly width: number;
  readonly height: number;
};

const frameCache = new Map<string, Promise<CroppedHeroIdleFrame>>();

function cacheKey(presentation: Extract<HeroIdlePresentation, { readonly spriteSheet: true }>): string {
  return [
    presentation.image,
    presentation.frameWidth,
    presentation.frameHeight,
    presentation.frameIndex,
  ].join(":");
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => { resolve(image); };
    image.onerror = () => { reject(new Error(`Unable to load hero preview image: ${source}`)); };
    image.src = source;
  });
}

function findOpaqueBounds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } | undefined {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[((y * width + x) * 4) + 3];
      if (alpha === undefined || alpha === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return undefined;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

async function cropFrame(
  presentation: Extract<HeroIdlePresentation, { readonly spriteSheet: true }>,
): Promise<CroppedHeroIdleFrame> {
  const source = await loadImage(presentation.image);
  const frameCanvas = document.createElement("canvas");
  frameCanvas.width = presentation.frameWidth;
  frameCanvas.height = presentation.frameHeight;
  const context = frameCanvas.getContext("2d", { willReadFrequently: true });
  if (context === null) {
    throw new Error("Unable to create hero preview canvas context");
  }

  context.clearRect(0, 0, presentation.frameWidth, presentation.frameHeight);
  context.drawImage(
    source,
    presentation.frameIndex * presentation.frameWidth,
    0,
    presentation.frameWidth,
    presentation.frameHeight,
    0,
    0,
    presentation.frameWidth,
    presentation.frameHeight,
  );

  const imageData = context.getImageData(0, 0, presentation.frameWidth, presentation.frameHeight);
  const bounds = findOpaqueBounds(imageData.data, presentation.frameWidth, presentation.frameHeight);
  if (bounds === undefined) {
    return {
      image: presentation.image,
      width: presentation.frameWidth,
      height: presentation.frameHeight,
    };
  }

  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = bounds.width;
  croppedCanvas.height = bounds.height;
  const croppedContext = croppedCanvas.getContext("2d");
  if (croppedContext === null) {
    throw new Error("Unable to create cropped hero preview canvas context");
  }

  croppedContext.drawImage(
    frameCanvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height,
  );

  return {
    image: croppedCanvas.toDataURL("image/png"),
    width: bounds.width,
    height: bounds.height,
  };
}

export function getCroppedHeroIdleFrame(
  presentation: HeroIdlePresentation,
): Promise<CroppedHeroIdleFrame> | undefined {
  if (!presentation.spriteSheet) return undefined;

  const key = cacheKey(presentation);
  const cached = frameCache.get(key);
  if (cached !== undefined) return cached;

  const request = cropFrame(presentation);
  frameCache.set(key, request);
  return request;
}
