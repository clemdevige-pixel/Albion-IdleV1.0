import { SaveFormatSchema } from "./save-format.js";
import { DeserializationFailedError } from "./errors.js";
import type { SaveFormat } from "./save-format.js";

export function deserialize(raw: string): SaveFormat {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (err) {
    throw new DeserializationFailedError("Invalid JSON", { cause: err });
  }

  const result = SaveFormatSchema.safeParse(parsed);
  if (!result.success) {
    throw new DeserializationFailedError(
      `Invalid save format: ${result.error.message}`,
      { cause: result.error },
    );
  }

  return result.data;
}
