/**
 * Technical test fixtures — NOT part of the public API.
 *
 * These fake components/systems exist only to exercise the generic framework.
 * They carry no gameplay meaning and are never re-exported from a barrel.
 */
import { defineComponent } from "../component/component-type.js";
import { systemId, type SimulationSystem, type SystemContext } from "../system/system.js";

export interface TestCounter {
  value: number;
}

export const TestCounterComponent = defineComponent<TestCounter>("test.counter");
export const TestTagComponent = defineComponent<{ readonly tag: string }>("test.tag");
export const TestNameComponent = defineComponent<{ readonly name: string }>("test.name");

/** Increments the counter of every entity that has one, every tick. */
export function makeCounterSystem(priority?: number): SimulationSystem {
  return {
    id: systemId("test.counter-system"),
    ...(priority === undefined ? {} : { priority }),
    update(context: SystemContext): void {
      for (const { entityId } of context.world.query(TestCounterComponent)) {
        const counter = context.world.getComponent(entityId, TestCounterComponent);
        counter.value += 1;
      }
    },
  };
}

/** Records the order in which systems run, into the shared `log`. */
export function makeOrderRecordingSystem(
  id: string,
  log: string[],
  priority?: number,
): SimulationSystem {
  return {
    id: systemId(id),
    ...(priority === undefined ? {} : { priority }),
    update(): void {
      log.push(id);
    },
  };
}
