/**
 * Typed errors for the entity framework.
 *
 * These signal programming errors (broken invariants), not expected absence.
 * Expected absence is modelled with `has*`/`tryGet*` returning booleans/`undefined`.
 */
export class EntityFrameworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class EntityNotFoundError extends EntityFrameworkError {
  constructor(public readonly entityId: number) {
    super(`Entity ${entityId} does not exist`);
  }
}

export class ComponentNotFoundError extends EntityFrameworkError {
  constructor(
    public readonly entityId: number,
    public readonly componentKey: string,
  ) {
    super(`Entity ${entityId} has no component "${componentKey}"`);
  }
}

export class ComponentAlreadyExistsError extends EntityFrameworkError {
  constructor(
    public readonly entityId: number,
    public readonly componentKey: string,
  ) {
    super(`Entity ${entityId} already has component "${componentKey}"`);
  }
}

export class SystemAlreadyRegisteredError extends EntityFrameworkError {
  constructor(public readonly systemId: string) {
    super(`System "${systemId}" is already registered`);
  }
}

export class SystemNotFoundError extends EntityFrameworkError {
  constructor(public readonly systemId: string) {
    super(`System "${systemId}" is not registered`);
  }
}
