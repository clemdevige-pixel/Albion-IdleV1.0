import { describe, expect, it } from "vitest";
import type { ClientAbilityDefinition } from "../../data/weaponContentCatalog";
import { describeAbilityMechanics } from "./abilitySync";

function ability(
  mechanics: ClientAbilityDefinition["mechanics"],
  damageType: ClientAbilityDefinition["damageType"] = "physical",
): ClientAbilityDefinition {
  return {
    id: "ability_test",
    name: "Test",
    description: "Description générique.",
    icon: "",
    category: "active",
    cooldown: 10,
    castTime: 0,
    resourceCost: {},
    interruptible: false,
    targetRule: "current_target",
    damageType,
    mechanics,
    bonusDamageRatio: 0,
  };
}

describe("ability tooltip mechanics", () => {
  it("uses the runtime direct-damage formula instead of exposing the raw bonus ratio", () => {
    const description = describeAbilityMechanics(ability({
      mechanics: [{ kind: "damage", ratio: 0.9 }],
    }));

    expect(description).toContain("190% de Dégâts physiques");
    expect(description).not.toContain("90% de Dégâts physiques");
  });

  it("describes multi-hit, conditional bonus and control values from authored mechanics", () => {
    const description = describeAbilityMechanics(ability({
      mechanics: [
        {
          kind: "damage",
          ratio: 1.55,
          hits: 2,
          bonusHealthBelow: { ratio: 0.5, bonusRatio: 0.75 },
        },
        {
          kind: "status",
          effectId: "effect_test_stun",
          effectType: "stun",
          duration: 1.25,
        },
      ],
    }));

    expect(description).toContain("255% de Dégâts physiques");
    expect(description).toContain("2 coups (127.5% par coup)");
    expect(description).toContain("sous 50% PV cible : 330% au total");
    expect(description).toContain("Étourdit pendant 1.25 s");
  });

  it("describes dot and life-steal values exactly", () => {
    const description = describeAbilityMechanics(ability({
      mechanics: [
        { kind: "damage", ratio: 0.595, hits: 2 },
        { kind: "dot", effectId: "effect_test_dot", ratio: 0.096, interval: 1, ticks: 3 },
        { kind: "heal_from_damage", ratio: 0.12, maxHealthRatio: 0.015 },
      ],
    }));

    expect(description).toContain("159.5% de Dégâts physiques");
    expect(description).toContain("9.6% de Dégâts physiques");
    expect(description).toContain("3 ticks (28.8% au total)");
    expect(description).toContain("Soigne 12% des dégâts réellement infligés, plafonné à 1.5% des PV max");
  });
});
