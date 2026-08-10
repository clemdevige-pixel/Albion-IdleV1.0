export interface DisplaySize {
  readonly width: number;
  readonly height: number;
}

/**
 * Static actors use authored height as the presentation authority.
 * Width is always derived from the native texture ratio so monster assets
 * cannot be stretched or squashed by an incorrect manifest width.
 */
export function resolveAspectPreservingDisplaySize(
  nativeWidth: number,
  nativeHeight: number,
  targetHeight: number,
): DisplaySize {
  if (!Number.isFinite(nativeWidth) || nativeWidth <= 0) {
    throw new Error(`Invalid native texture width: ${String(nativeWidth)}`);
  }
  if (!Number.isFinite(nativeHeight) || nativeHeight <= 0) {
    throw new Error(`Invalid native texture height: ${String(nativeHeight)}`);
  }
  if (!Number.isFinite(targetHeight) || targetHeight <= 0) {
    throw new Error(`Invalid target display height: ${String(targetHeight)}`);
  }

  return {
    width: targetHeight * (nativeWidth / nativeHeight),
    height: targetHeight,
  };
}
