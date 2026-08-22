import type { SaveFormat } from "@game/persistence";

const SERVER_SAVED_AT_KEY = "serverSavedAt";
const SERVER_NOW_KEY = "serverNow";

export function resolveTrustedOfflineElapsedMs(save: SaveFormat): number {
  const extra = save.metadata.extra;
  const serverSavedAt = extra?.[SERVER_SAVED_AT_KEY];
  const serverNow = extra?.[SERVER_NOW_KEY];

  if (
    typeof serverSavedAt !== "number"
    || typeof serverNow !== "number"
    || !Number.isSafeInteger(serverSavedAt)
    || !Number.isSafeInteger(serverNow)
    || serverSavedAt < 0
    || serverNow < serverSavedAt
  ) {
    return 0;
  }

  return serverNow - serverSavedAt;
}
