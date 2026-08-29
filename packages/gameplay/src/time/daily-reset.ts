import { DAILY_RESET_RULES } from "@game/data";

const HOUR_MS = 60 * 60 * 1_000;

export function getDailyRotationId(nowMs: number = Date.now()): string {
  const shifted = new Date(nowMs - DAILY_RESET_RULES.resetHourUtc * HOUR_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${String(year)}-${month}-${day}`;
}

export function getNextDailyResetAt(nowMs: number = Date.now()): number {
  const shifted = new Date(nowMs - DAILY_RESET_RULES.resetHourUtc * HOUR_MS);
  return Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() + 1,
    DAILY_RESET_RULES.resetHourUtc,
  );
}
