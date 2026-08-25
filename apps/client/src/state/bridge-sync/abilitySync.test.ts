import { describe, expect, it } from "vitest";
import type { ClientAbilityDefinition } from "../../data/weaponContentCatalog";
import { describeAbilityMechanics, type AbilityTooltipStats } from "./abilitySync";

const TOOLTIP_STATS: AbilityTooltipStats = {
  physicalDamage: 100,
  magicalDamage: 80,
  abilityPowerPercent: 20,
};

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
  it("shows the current runtime damage amount instead of a scaling percentage", () => {
    const description = describeAbilityMechanics(ability({
      mechanics: [{ kind: "damage", ratio: 0.9 }],
    }), TOOLTIP_STATS);

    expect(description).toContain("Inflige 228 dégâts physiques");
    expect(description).not.toContain("190% de Dégâts physiques");
  });

  it("describes multi-hit, conditional bonus and control values with current damage amounts", () => {
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
    }), TOOLTIP_STATS);

    expect(description).toContain("306 dégâts physiques");
    expect(description).toContain("2 coups (153 par coup)");
    expect(description).toContain("sous 50% PV cible : 396 dégâts au total");
    expect(description).toContain("Étourdit pendant 1.25 s");
  });

  it("describes dot damage amounts and life-steal values exactly", () => {
    const description = describeAbilityMechanics(ability({
      mechanics: [
        { kind: "damage", ratio: 0.595, hits: 2 },
        { kind: "dot", effectId: "effect_test_dot", ratio: 0.096, interval: 1, ticks: 3 },
        { kind: "heal_from_damage", ratio: 0.12, maxHealthRatio: 0.015 },
      ],
    }), TOOLTIP_STATS);

    expect(description).toContain("191.4 dégâts physiques");
    expect(description).toContain("11.52 dégâts physiques");
    expect(description).toContain("3 ticks (34.56 dégâts au total)");
    expect(description).toContain("Soigne 12% des dégâts réellement infligés, plafonné à 1.5% des PV max");
  });
});
