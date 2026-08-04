import { describe, expect, it } from "vitest";
import { SystemAlreadyRegisteredError, SystemNotFoundError } from "../entity/errors.js";
import { createRuntimeServices, type RuntimeServices } from "../runtime/index.js";
import { World } from "../world/world.js";
import { makeOrderRecordingSystem } from "../world/test-fixtures.js";
import { SystemRegistry } from "./system-registry.js";
import { systemId, type SystemContext } from "./system.js";

function context(): SystemContext {
  const services: RuntimeServices = createRuntimeServices();
  return { world: new World(services), tick: 0, deltaTime: 0, services };
}

describe("system registry", () => {
  it("executes systems by priority then registration order", () => {
    const registry = new SystemRegistry();
    const log: string[] = [];
    registry.register(makeOrderRecordingSystem("late", log, 10));
    registry.register(makeOrderRecordingSystem("early", log, -5));
    registry.register(makeOrderRecordingSystem("mid-a", log, 0));
    registry.register(makeOrderRecordingSystem("mid-b", log, 0));

    registry.execute(context());
    expect(log).toEqual(["early", "mid-a", "mid-b", "late"]);
  });

  it("prevents duplicate ids and reports removal of unknown systems", () => {
    const registry = new SystemRegistry();
    const log: string[] = [];
    registry.register(makeOrderRecordingSystem("s", log));
    expect(() => registry.register(makeOrderRecordingSystem("s", log))).toThrow(
      SystemAlreadyRegisteredError,
    );
    expect(() => registry.unregister(systemId("missing"))).toThrow(SystemNotFoundError);
  });

  it("does not execute a removed system", () => {
    const registry = new SystemRegistry();
    const log: string[] = [];
    registry.register(makeOrderRecordingSystem("keep", log));
    registry.register(makeOrderRecordingSystem("drop", log));
    registry.unregister(systemId("drop"));
    registry.execute(context());
    expect(log).toEqual(["keep"]);
  });
});
