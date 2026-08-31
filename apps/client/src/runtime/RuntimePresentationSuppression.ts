let suppressionDepth = 0;

/**
 * Presentation suppression is an app-layer concern used only while replaying
 * authoritative fixed-step ticks after a hidden browser session. Gameplay
 * domain logic keeps running through the normal runtime path; only transient
 * bridge/presentation work is skipped until one final resync.
 */
export function isRuntimePresentationSuppressed(): boolean {
  return suppressionDepth > 0;
}

export function runWithRuntimePresentationSuppressed<T>(run: () => T): T {
  suppressionDepth += 1;
  try {
    return run();
  } finally {
    suppressionDepth -= 1;
  }
}
