import { describe, expect, it, vi } from "vitest";
import {
  CombatRewardRuntime,
  applyPercentBonusRounded,
  rollFactionYieldBonusDrops,
} from "./CombatRewardRuntime.js";

describe("faction combat yield", () => {
  it("rounds Silver and Fame yield to the nearest whole value like faction Runes", () => {
    expect(applyPercentBonusRounded(100, 0.5)).toBe(101);
    expect(applyPercentBonusRounded(150, 0.5)).toBe(151);
    expect(applyPercentBonusRounded(200, 0.5)).toBe(201);
    expect(applyPercentBonusRounded(100, 25)).toBe(125);
  });

  it("applies mastery to expected loot before the probabilistic roll", () => {
    const drops = rollFactionYieldBonusDrops({
      segmentIndex: 0,
      faction: "Keeper",
      isElite: false,
      isBoss: false,
      isFinalBoss: false,
      enchantmentTier: 4,
      enchantmentDropWeight: 1,
      dungeonKeyDropWeight: 1,
    }, 50, () => 0);

    expect(drops).toEqual([
      { itemId: "item_resource_enchantment_shard_t4", kind: "enchantment", quantity: 1 },
      { itemId: "item_resource_dungeon_key_fragment_t4", kind: "key_fragment", quantity: 1 },
      { itemId: "item_resource_dungeon_key_t4", kind: "key", quantity: 1 },
    ]);
  });

  it("uses final earned Fame 1:1 for faction mastery and Awake attunement", () => {
    const onRawFactionFame = vi.fn((_: string, fame: number) => fame === 0 ? 50 : 0);
    const addAttunement = vi.fn(() => ({
      ok: true,
      value: { requested: 150, stored: 150, discardedAtCap: 0, balance: 150, cap: 1000 },
    }));
    const runtime = new CombatRewardRuntime({
      currencyService: {
        credit: vi.fn(() => ({ ok: true, value: 150 })),
        getBalance: vi.fn(() => ({ ok: true, value: 150 })),
      } as never,
      walletId: "wallet" as never,
      equipmentManager: {
        getEquippedItem: vi.fn(() => ({
          itemId: "item_weapon_sword_t4_broadsword",
          instanceId: "awake-weapon",
          enchantment: 4,
        })),
      } as never,
      inventoryManager: {
        addQuantity: vi.fn(() => ({ ok: false })),
      } as never,
      durabilityStore: {} as never,
      progressionOrchestrator: {
        onEquipmentAcquired: vi.fn(),
        onFameEarned: vi.fn(),
      } as never,
      experienceService: { addExperience: vi.fn() } as never,
      awakenedWeaponService: {
        getTraitValue: vi.fn(() => 0),
        has: vi.fn(() => true),
        addAttunement,
      } as never,
      heroId: 1 as never,
      onRawFactionFame,
      random: () => 1,
    });

    const result = runtime.processEnemyKilledReward(100, 100, {
      segmentIndex: 0,
      faction: "Keeper",
      isElite: false,
      isBoss: false,
      isFinalBoss: false,
      enchantmentTier: 4,
      enchantmentDropWeight: 0,
      dungeonKeyDropWeight: 0,
    });

    expect(result.silverEarned).toBe(150);
    expect(result.fameEarned?.amount).toBe(150);
    expect(onRawFactionFame).toHaveBeenNthCalledWith(1, "Keeper", 0);
    expect(onRawFactionFame).toHaveBeenNthCalledWith(2, "Keeper", 150);
    expect(addAttunement).toHaveBeenCalledWith("awake-weapon", 150);
  });
});
