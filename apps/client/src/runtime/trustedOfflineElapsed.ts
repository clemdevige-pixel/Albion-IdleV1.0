import type { SaveFormat } from "@game/persistence";

const SERVER_SAVED_AT_KEY = "serverSavedAt";
const SERVER_NOW_KEY = "serverNow";
export const TRUSTED_OFFLINE_RESOLVED_THROUGH_KEY = "trustedOfflineResolvedThrough";

export interface TrustedOfflineWindow {
  readonly elapsedMs: number;
  readonly serverNow: number;
}

function isValidTimestamp(value: unknown): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0;
}

export function resolveTrustedOfflineWindow(save: SaveFormat): TrustedOfflineWindow | undefined {
  const extra = save.metadata.extra;
  const serverSavedAt = extra?.[SERVER_SAVED_AT_KEY];
  const serverNow = extra?.[SERVER_NOW_KEY];

  if (
    !isValidTimestamp(serverSavedAt)
    || !isValidTimestamp(serverNow)
    || serverNow < serverSavedAt
  ) {
    return undefined;
  }

  const resolvedThrough = extra?.[TRUSTED_OFFLINE_RESOLVED_THROUGH_KEY];
  const effectiveStart = isValidTimestamp(resolvedThrough)
    ? Math.max(serverSavedAt, resolvedThrough)
    : serverSavedAt;

  return {
    elapsedMs: Math.max(0, serverNow - effectiveStart),
    serverNow,
  };
}

export function resolveTrustedOfflineResolvedThrough(save: SaveFormat): number | undefined {
  const value = save.metadata.extra?.[TRUSTED_OFFLINE_RESOLVED_THROUGH_KEY];
  return isValidTimestamp(value) ? value : undefined;
}

export function resolveTrustedOfflineElapsedMs(save: SaveFormat): number {
  return resolveTrustedOfflineWindow(save)?.elapsedMs ?? 0;
}
