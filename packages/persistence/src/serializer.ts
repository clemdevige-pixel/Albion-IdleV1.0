import { SerializationFailedError } from "./errors.js";

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  const sorted: Record<string, unknown> = {};
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortKeys(obj[key]);
  }
  return sorted;
}

export function serialize(data: unknown): string {
  try {
    return JSON.stringify(sortKeys(data));
  } catch (err) {
    throw new SerializationFailedError("Failed to serialize data", {
      cause: err,
    });
  }
}

export function computeChecksum(data: unknown): string {
  const raw = JSON.stringify(sortKeys(data));
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
