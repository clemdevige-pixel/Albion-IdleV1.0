import { SaveFormatSchema } from "./save-format.js";
import { InvalidSaveError, VersionMismatchError } from "./errors.js";
import { computeChecksum } from "./serializer.js";
import type { SaveFormat } from "./save-format.js";

export class SaveValidator {
  constructor(private readonly currentVersion: number) {}

  validate(save: SaveFormat): void {
    this.validateFormat(save);
    this.validateChecksum(save);
  }

  validateFormat(save: SaveFormat): void {
    const result = SaveFormatSchema.safeParse(save);
    if (!result.success) {
      throw new InvalidSaveError(`Invalid save format: ${result.error.message}`, {
        cause: result.error,
      });
    }
  }

  validateVersion(save: SaveFormat): void {
    if (save.version !== this.currentVersion) {
      throw new VersionMismatchError(this.currentVersion, save.version);
    }
  }

  validateChecksum(save: SaveFormat): void {
    const expected = computeChecksum(save.payload);
    if (save.checksum !== expected) {
      throw new InvalidSaveError(
        `Checksum mismatch: expected ${expected}, got ${save.checksum}`,
      );
    }
  }
}
