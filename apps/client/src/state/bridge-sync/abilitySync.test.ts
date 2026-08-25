import { describe, expect, it } from "vitest";
import type { EntityId } from "@game/core";
import type { AbilityManager } from "@game/gameplay";
import type { ClientAbilityDefinition } from "../../data/weaponContentCatalog";
import type { GameBridge } from "../../game/GameBridge";
import {
  buildAbilityDetails,
  syncAbilitiesToBridge,
  type AbilityTooltipStats,
} from "./abilitySync";

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
    description: "Description authorée.",
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
  it("exposes the current runtime damage amount as structured data", () => {
    const details = buildAbilityDetails(ability({
      mechanics: [{ kind: "damage", ratio: 0.9 }],
    }), TOOLTIP_STATS);

    expect(details).toEqual([{
      kind: "damage",
      amount: 228,
      damageType: "physical",
      hits: 1,
      amountPerHit: 228,
      conditionalAmounts: [],
    }]);
  });

  it("exposes multi-hit, conditional bonus and control values without generated prose", () => {
    const details = buildAbilityDetails(ability({
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

    expect(details[0]).toEqual({
      kind: "damage",
      amount: 306,
      damageType: "physical",
      hits: 2,
      amountPerHit: 153,
      conditionalAmounts: [{ kind: "health_below", thresholdRatio: 0.5, amount: 396 }],
    });
    expect(details[1]).toEqual({
      kind: "status",
      target: "enemy",
      effectType: "stun",
      duration: 1.25,
    });
  });

  it("exposes dot and life-steal values as structured data", () => {
    const details = buildAbilityDetails(ability({
      mechanics: [
        { kind: "damage", ratio: 0.595, hits: 2 },
        { kind: "dot", effectId: "effect_test_dot", ratio: 0.096, interval: 1, ticks: 3 },
        { kind: "heal_from_damage", ratio: 0.12, maxHealthRatio: 0.015 },
      ],
    }), TOOLTIP_STATS);

    expect(details[0]).toMatchObject({ kind: "damage", amount: 191.4, hits: 2, amountPerHit: 95.7 });
    expect(details[1]).toMatchObject({
      kind: "dot",
      amountPerTick: 11.52,
      totalAmount: 34.56,
      interval: 1,
      ticks: 3,
      damageType: "physical",
    });
    expect(details[2]).toEqual({
      kind: "heal_from_damage",
      ratio: 0.12,
      maxHealthRatio: 0.015,
    });
  });
});

describe("ability mastery routing", () => {
  it("unlocks Q/W/E from family mastery even when specialization mastery stays at 1", () => {
    let syncedAbilities: unknown;
    const bridge = {
      progression: {
        masteries: [
          { id: "mastery_bow", level: 30 },
          { id: "mastery_longbow", level: 1 },
        ],
      },
      stats: { stats: [] },
      combatState: "combat",
      updateAbilities: (abilities: unknown) => { syncedAbilities = abilities; },
    } as unknown as GameBridge;
    const abilityManager = {
      getAbility: (_heroId: EntityId, abilityId: string) => ({
        abilityId,
        state: "ready",
        cooldownRemaining: 0,
      }),
    } as unknown as AbilityManager;

    syncAbilitiesToBridge(
      bridge,
      abilityManager,
      1 as EntityId,
      "item_weapon_bow_t3_longbow",
      true,
    );

    expect(syncedAbilities).toMatchObject({
      primary: { id: "ability_bow_aimed_shot" },
      secondary: { id: "ability_bow_piercing_arrow" },
      ultimate: { id: "ability_bow_deadeye" },
    });
  });
});
