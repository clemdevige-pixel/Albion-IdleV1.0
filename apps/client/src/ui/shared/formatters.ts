export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function formatCompactNumber(value: number, emptyValue = "—"): string {
  if (!Number.isFinite(value) || value <= 0) return emptyValue;
  if (value >= 1_000_000) {
    return `${String(Math.round(value / 100_000) / 10).replace(".", ",")}M`;
  }
  if (value >= 1_000) {
    return `${String(Math.round(value / 100) / 10).replace(".", ",")}K`;
  }
  return String(Math.round(value));
}

export function formatSignedNumber(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${String(rounded)}`;
}
