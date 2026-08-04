import { describe, it, expect, beforeEach } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { TargetManager } from "../target-manager.js";
import { TargetValidator } from "../target-validator.js";
import { TargetComponent } from "../components.js";

function createTestWorld(): World {
  return new World(createRuntimeServices());
}

describe("TargetManager", () => {
  let world: World;
  let manager: TargetManager;

  beforeEach(() => {
    world = createTestWorld();
    const validator = new TargetValidator(world);
    manager = new TargetManager(world, validator);
  });

  it("attaches targeting component with null target", () => {
    const entity = world.createEntity();
    manager.attachTargeting(entity);
    expect(world.hasComponent(entity, TargetComponent)).toBe(true);
    expect(manager.getTarget(entity)).toBeNull();
  });

  it("sets a target", () => {
    const source = world.createEntity();
    const target = world.createEntity();
    manager.attachTargeting(source);
    manager.setTarget(source, target);
    expect(manager.getTarget(source)).toBe(target);
  });

  it("changes target to a new entity", () => {
    const source = world.createEntity();
    const target1 = world.createEntity();
    const target2 = world.createEntity();
    manager.attachTargeting(source);
    manager.setTarget(source, target1);
    manager.setTarget(source, target2);
    expect(manager.getTarget(source)).toBe(target2);
  });

  it("clears the target", () => {
    const source = world.createEntity();
    const target = world.createEntity();
    manager.attachTargeting(source);
    manager.setTarget(source, target);
    manager.clearTarget(source);
    expect(manager.getTarget(source)).toBeNull();
  });

  it("hasTarget returns true when set, false when null", () => {
    const source = world.createEntity();
    const target = world.createEntity();
    manager.attachTargeting(source);
    expect(manager.hasTarget(source)).toBe(false);
    manager.setTarget(source, target);
    expect(manager.hasTarget(source)).toBe(true);
  });

  it("rejects self-targeting", () => {
    const entity = world.createEntity();
    manager.attachTargeting(entity);
    const result = manager.setTarget(entity, entity);
    expect(result).toBe(false);
    expect(manager.getTarget(entity)).toBeNull();
  });

  it("rejects targeting a non-existent entity", () => {
    const source = world.createEntity();
    manager.attachTargeting(source);
    const result = manager.setTarget(source, 9999 as ReturnType<typeof world.createEntity>);
    expect(result).toBe(false);
    expect(manager.getTarget(source)).toBeNull();
  });

  it("isTargetValid returns true when target exists", () => {
    const source = world.createEntity();
    const target = world.createEntity();
    manager.attachTargeting(source);
    manager.setTarget(source, target);
    expect(manager.isTargetValid(source)).toBe(true);
  });

  it("isTargetValid returns false when target entity is destroyed", () => {
    const source = world.createEntity();
    const target = world.createEntity();
    manager.attachTargeting(source);
    manager.setTarget(source, target);
    world.destroyEntity(target);
    expect(manager.isTargetValid(source)).toBe(false);
  });

  it("cleanupInvalidTarget clears dead target and returns true", () => {
    const source = world.createEntity();
    const target = world.createEntity();
    manager.attachTargeting(source);
    manager.setTarget(source, target);
    world.destroyEntity(target);
    const cleaned = manager.cleanupInvalidTarget(source);
    expect(cleaned).toBe(true);
    expect(manager.getTarget(source)).toBeNull();
  });

  it("cleanupInvalidTarget is a no-op when target is valid", () => {
    const source = world.createEntity();
    const target = world.createEntity();
    manager.attachTargeting(source);
    manager.setTarget(source, target);
    const cleaned = manager.cleanupInvalidTarget(source);
    expect(cleaned).toBe(false);
    expect(manager.getTarget(source)).toBe(target);
  });

  it("detaches targeting component", () => {
    const entity = world.createEntity();
    manager.attachTargeting(entity);
    manager.detachTargeting(entity);
    expect(world.hasComponent(entity, TargetComponent)).toBe(false);
  });
});

describe("TargetValidator — living targets (20_COMBAT Rule 14)", () => {
  it("rejects dead targets and selectNearestTarget picks nearest living enemy", async () => {
    const { HealthComponent } = await import("../../damage/components.js");
    const { PositionComponent } = await import("../../character/components.js");
    const world = createTestWorld();
    const validator = new TargetValidator(world);
    const manager = new TargetManager(world, validator);

    const source = world.createEntity();
    manager.attachTargeting(source);
    world.addComponent(source, PositionComponent, { x: 0, y: 0 });

    const near = world.createEntity();
    world.addComponent(near, PositionComponent, { x: 2, y: 0 });
    world.addComponent(near, HealthComponent, { currentHealth: 10, maxHealth: 10 });

    const far = world.createEntity();
    world.addComponent(far, PositionComponent, { x: 5, y: 0 });
    world.addComponent(far, HealthComponent, { currentHealth: 10, maxHealth: 10 });

    const dead = world.createEntity();
    world.addComponent(dead, PositionComponent, { x: 1, y: 0 });
    world.addComponent(dead, HealthComponent, { currentHealth: 0, maxHealth: 10 });

    // Dead entities are not valid targets
    expect(validator.isValid(source, dead)).toBe(false);
    expect(manager.setTarget(source, dead)).toBe(false);

    // Nearest living enemy is selected (dead one at x=1 is skipped)
    expect(manager.selectNearestTarget(source, [far, dead, near])).toBe(near);
    expect(manager.getTarget(source)).toBe(near);

    // After the nearest dies, the next nearest living enemy is selected
    world.getComponent(near, HealthComponent).currentHealth = 0;
    expect(manager.selectNearestTarget(source, [far, dead, near])).toBe(far);

    // No valid candidates → null
    world.getComponent(far, HealthComponent).currentHealth = 0;
    expect(manager.selectNearestTarget(source, [far, dead, near])).toBeNull();
  });

  it("deterministic tie-break by entity id at equal distance (31_RUNTIME §21)", async () => {
    const { PositionComponent } = await import("../../character/components.js");
    const world = createTestWorld();
    const validator = new TargetValidator(world);
    const manager = new TargetManager(world, validator);

    const source = world.createEntity();
    manager.attachTargeting(source);
    world.addComponent(source, PositionComponent, { x: 0, y: 0 });

    const a = world.createEntity();
    world.addComponent(a, PositionComponent, { x: 3, y: 0 });
    const b = world.createEntity();
    world.addComponent(b, PositionComponent, { x: -3, y: 0 });

    expect(manager.selectNearestTarget(source, [b, a])).toBe(a < b ? a : b);
    expect(manager.selectNearestTarget(source, [a, b])).toBe(a < b ? a : b);
  });
});
