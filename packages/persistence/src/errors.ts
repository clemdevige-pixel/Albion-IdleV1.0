export class PersistenceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PersistenceError";
  }
}

export class SaveNotFoundError extends PersistenceError {
  constructor(readonly saveId: string) {
    super(`Save not found: ${saveId}`);
    this.name = "SaveNotFoundError";
  }
}

export class InvalidSaveError extends PersistenceError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "InvalidSaveError";
  }
}

export class MigrationFailedError extends PersistenceError {
  constructor(
    readonly fromVersion: number,
    readonly toVersion: number,
    options?: ErrorOptions,
  ) {
    super(`Migration failed from v${fromVersion} to v${toVersion}`, options);
    this.name = "MigrationFailedError";
  }
}

export class SerializationFailedError extends PersistenceError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SerializationFailedError";
  }
}

export class DeserializationFailedError extends PersistenceError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DeserializationFailedError";
  }
}

export class VersionMismatchError extends PersistenceError {
  constructor(
    readonly expected: number,
    readonly actual: number,
  ) {
    super(`Version mismatch: expected ${expected}, got ${actual}`);
    this.name = "VersionMismatchError";
  }
}
