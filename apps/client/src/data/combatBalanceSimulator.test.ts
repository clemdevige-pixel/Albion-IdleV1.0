import { describe, expect, it } from "vitest";
import {
  compareCombatBalance,
  simulateCombatBalance,
  type CombatBalanceEnemyProfile,
} from "./combatBalanceSimulator.js";

const TEST_ENEMY: CombatBalanceEnemyProfile = {
  id: "balance_dummy_t4",
  health: 2200,
  armor: 25,
  magicResistance: 25,
  physicalDamage: 42,
  magicalDamage: 0,
  attackSpeed: 0.9,
};

const T4_LOADOUTS = [
  { weaponId: "item_weapon_sword_t4_broadsword", offHandId: "item_shield_t4_reinforced", masteryLevel: 30 },
  { weaponId: "item_weapon_bow_t4_longbow", masteryLevel: 30 },
  { weaponId: "item_weapon_bow_t4_badon", masteryLevel: 30 },
  { weaponId: "item_weapon_staff_t4_infernal", masteryLevel: 30 },
  { weaponId: "item_weapon_gloves_t4_spiked_gauntlets", masteryLevel: 30 },
  { weaponId: "item_weapon_dagger_t4_pair", masteryLevel: 30 },
] as const;

describe("combat balance simulator", () => {
  it("simulates every current T4 weapon deterministically", () => {
    const first = compareCombatBalance(T4_LOADOUTS, TEST_ENEMY);
    const second = compareCombatBalance(T4_LOADOUTS, TEST_ENEMY);
    expect(first).toEqual(second);
    expect(first).toHaveLength(T4_LOADOUTS.length);
    for (const result of first) {
      expect(Number.isFinite(result.dps)).toBe(true);
      expect(Number.isFinite(result.incomingDps)).toBe(true);
      expect(result.elapsedSeconds).toBeGreaterThan(0);
    }
  });

  it("models the defensive value of an off-hand shield", () => {
    const bare = simulateCombatBalance(
      { weaponId: "item_weapon_sword_t4_broadsword", masteryLevel: 10 },
      TEST_ENEMY,
    );
    const shielded = simulateCombatBalance(
      {
        weaponId: "item_weapon_sword_t4_broadsword",
        offHandId: "item_shield_t4_reinforced",
        masteryLevel: 10,
      },
      TEST_ENEMY,
    );
    expect(shielded.breakdown.damageTaken).toBeLessThan(bare.breakdown.damageTaken);
  });

  it("accounts for DoT contribution on the infernal staff", () => {
    const result = simulateCombatBalance(
      { weaponId: "item_weapon_staff_t4_infernal", masteryLevel: 30 },
      TEST_ENEMY,
    );
    expect(result.breakdown.dotTicks).toBeGreaterThan(0);
    expect(result.breakdown.dotDamage).toBeGreaterThan(0);
  });

  it("uses mastery thresholds to change the available ability rotation", () => {
    const m1 = simulateCombatBalance(
      { weaponId: "item_weapon_dagger_t4_pair", masteryLevel: 1 },
      TEST_ENEMY,
    );
    const m30 = simulateCombatBalance(
      { weaponId: "item_weapon_dagger_t4_pair", masteryLevel: 30 },
      TEST_ENEMY,
    );
    expect(m30.breakdown.abilityCasts).toBeGreaterThanOrEqual(m1.breakdown.abilityCasts);
    expect(m30.breakdown.abilityDamage).toBeGreaterThan(m1.breakdown.abilityDamage);
  });

  it("separates AFK and active potion survival without changing outgoing DPS rules", () => {
    const dangerousEnemy: CombatBalanceEnemyProfile = {
      ...TEST_ENEMY,
      health: 3200,
      physicalDamage: 55,
    };
    const loadout = {
      weaponId: "item_weapon_sword_t4_broadsword",
      offHandId: "item_shield_t4_reinforced",
      masteryLevel: 10,
    } as const;
    const afk = simulateCombatBalance(loadout, dangerousEnemy);
    const active = simulateCombatBalance(
      {
        ...loadout,
        consumables: { healthPotion: "auto" },
      },
      dangerousEnemy,
    );

    expect(afk.breakdown.healthPotionsUsed).toBe(0);
    expect(afk.breakdown.healingReceived).toBe(0);
    expect(active.breakdown.healthPotionsUsed).toBeGreaterThan(0);
    expect(active.breakdown.healingReceived).toBeGreaterThan(0);
    expect(active.heroHealthRemaining).toBeGreaterThanOrEqual(afk.heroHealthRemaining);
  });
});
