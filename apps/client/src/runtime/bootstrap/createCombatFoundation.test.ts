import { describe, expect, it } from "vitest";
import { HealthComponent } from "@game/gameplay";
import { createCombatFoundation } from "./createCombatFoundation";

describe("createCombatFoundation", () => {
  it("creates a connected combat foundation outside React", () => {
    const foundation = createCombatFoundation();
    const entityId = foundation.world.createEntity();
    foundation.world.addComponent(entityId, HealthComponent, {
      currentHealth: 100,
      maxHealth: 100,
    });

    expect(foundation.damageManager.getHealth(entityId)).toEqual({
      currentHealth: 100,
      maxHealth: 100,
    });

    foundation.orchestrator.dispose();
  });
});
