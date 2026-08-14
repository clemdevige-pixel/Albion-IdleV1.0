import { describe, expect, it } from "vitest";
import {
  compareCombatBalance,
  simulateCombatBalance,
  type CombatBalanceEnemyProfile,
  type CombatBalanceLoadout,
} from "./combatBalanceSimulator.js";
import {
  WEAPON_ITEM_DEFINITIONS,
  resolveWeaponTier,
} from "./weaponContentCatalog.js";

const TEST_ENEMY: CombatBalanceEnemyProfile = {
  id: "balance_dummy_t4",
  health: 2200,
  armor: 25,
  magicResistance: 25,
  physicalDamage: 42,
  magicalDamage: 0,
  attackSpeed: 0.9,
};

function makeT4BenchmarkLoadouts(): readonly CombatBalanceLoadout[] {
  return Object.entries(WEAPON_ITEM_DEFINITIONS)
    .filter(([weaponId]) => resolveWeaponTier(weaponId) === 4)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([weaponId, weapon]) => ({
      weaponId,
      masteryLevel: 30,
      ...(weapon.handling === "one_handed"
        ? { offHandId: "item_shield_t4_reinforced" }
        : {}),
    }));
}

const T4_LOADOUTS = makeT4BenchmarkLoadouts();

describe("combat balance simulator", () => {
  it("simulates every current and future registered T4 weapon deterministically", () => {
    const first = compareCombatBalance(T4_LOADOUTS, TEST_ENEMY);
    const second = compareCombatBalance(T4_LOADOUTS, TEST_ENEMY);
    expect(first).toEqual(second);
    expect(first).toHaveLength(T4_LOADOUTS.length);
    expect(first).toHaveLength(
      Object.keys(WEAPON_ITEM_DEFINITIONS).filter((weaponId) => resolveWeaponTier(weaponId) === 4).length,
    );
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
    expect(shielded.incomingDps).toBeLessThan(bare.incomingDps);
    expect(shielded.elapsedSeconds).toBeGreaterThanOrEqual(bare.elapsedSeconds);
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
