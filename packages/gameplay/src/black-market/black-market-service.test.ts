import { describe, expect, it } from "vitest";
import { BLACK_MARKET_ROUTES } from "@game/data";
import { resolveEquipmentEconomicValue } from "./economic-value.js";
import {
  BlackMarketService,
  type BlackMarketCargoUnit,
} from "./black-market-service.js";

function unit(overrides: Partial<BlackMarketCargoUnit> = {}): BlackMarketCargoUnit {
  return {
    instanceId: "inventory|item_weapon_bow_t4_longbow|0|0|seed",
    itemId: "item_weapon_bow_t4_longbow",
    enchantment: 0,
    tier: 4,
    economicValue: 20_000,
    weaponFamily: "bow",
    ...overrides,
  };
}

describe("Black Market economic value", () => {
  it("prices a representative T4 standard craft from canonical refined values", () => {
    const value = resolveEquipmentEconomicValue({
      recipe: {
        outputItemId: "item_weapon_bow_t4_longbow",
        requirements: [
          { itemId: "item_refined_wood_t4", quantity: 6 },
          { itemId: "item_refined_hide_t4", quantity: 2 },
          { itemId: "item_refined_fiber_t4", quantity: 2 },
        ],
      },
      itemTier: 4,
      enchantment: 0,
      enchantmentCategory: "two_handed_weapon",
    });
    expect(value).toBe(20_000);
  });

  it("uses intrinsic artifact and Rune values instead of merchant artifact markup", () => {
    const value = resolveEquipmentEconomicValue({
      recipe: {
        outputItemId: "item_weapon_bow_t8_artifact_test",
        requirements: [
          { itemId: "item_refined_wood_t8", quantity: 6 },
          { itemId: "item_refined_hide_t8", quantity: 2 },
          { itemId: "item_refined_fiber_t8", quantity: 2 },
          { itemId: "item_resource_artifact_keeper_t8", quantity: 1 },
          { itemId: "item_resource_rune_faction_t8", quantity: 10 },
        ],
      },
      itemTier: 8,
      enchantment: 0,
      enchantmentCategory: "two_handed_weapon",
    });
    expect(value).toBe(545_000);
  });
});

describe("BlackMarketService", () => {
  it("generates deterministic daily demands with no exact duplicates", () => {
    const create = () => new BlackMarketService({ commitCargo: () => true, creditSilver: () => true });
    const now = Date.UTC(2026, 7, 29, 12);
    const first = create().getSnapshot(now, [4, 5, 6, 7, 8]);
    const second = create().getSnapshot(now, [4, 5, 6, 7, 8]);
    expect(first.demands).toEqual(second.demands);
    expect(first.demands).toHaveLength(3);
    expect(new Set(first.demands.map((entry) => `${entry.targetType}|${entry.targetId}|${String(entry.tier)}`)).size).toBe(3);
  });

  it("rejects more than eight cargo stacks or more than five units in one stack", () => {
    const service = new BlackMarketService({ commitCargo: () => true, creditSilver: () => true });
    const now = Date.UTC(2026, 7, 29, 12);
    const sixSame = Array.from({ length: 6 }, (_, index) => unit({ instanceId: `same_${String(index)}` }));
    expect(service.startConvoy(sixSame, "watched", now, [4])).toBe(false);

    const nineStacks = Array.from({ length: 9 }, (_, index) => unit({
      instanceId: `stack_${String(index)}`,
      itemId: `item_weapon_bow_t4_test_${String(index)}`,
    }));
    expect(service.startConvoy(nineStacks, "watched", now, [4])).toBe(false);
  });

  it("quotes and consumes demand quantity at departure", () => {
    const service = new BlackMarketService({ commitCargo: () => true, creditSilver: () => true });
    const now = Date.UTC(2026, 7, 29, 12);
    const snapshot = service.getSnapshot(now, [4]);
    const matching = snapshot.demands[0]!;
    const matchingUnit = unit({
      tier: matching.tier,
      itemId: `item_${matching.targetId}_${String(matching.tier)}`,
      instanceId: "matching_1",
      ...(matching.targetType === "weapon_family" ? { weaponFamily: matching.targetId } : {}),
      ...(matching.targetType === "armor_slot" ? { armorSlot: matching.targetId } : {}),
    });
    const quote = service.quoteCargo([matchingUnit], now, [4]);
    expect(quote).toBeDefined();
    expect(quote!.cargoBmValue).toBeGreaterThan(Math.round(matchingUnit.economicValue * 0.55));
    expect(service.startConvoy([matchingUnit], "watched", now, [4])).toBe(true);
    const after = service.getSnapshot(now, [4]);
    expect(after.demands.find((entry) => entry.id === matching.id)?.fulfilledQuantity).toBe(1);
  });

  it("preserves a fixed convoy outcome through save/load and pays at most once", () => {
    const now = Date.UTC(2026, 7, 29, 12);
    let successfulSave: unknown;
    let expectedPayout = 0;

    for (let offset = 0; offset < 100 && successfulSave === undefined; offset += 1) {
      const candidateNow = now + offset;
      const candidate = new BlackMarketService({ commitCargo: () => true, creditSilver: () => true });
      if (!candidate.startConvoy([unit({ instanceId: `fixed_${String(offset)}` })], "watched", candidateNow, [4])) continue;
      const state = candidate.getSnapshot(candidateNow, [4]);
      if (state.activeConvoy?.success === true) {
        successfulSave = candidate.save();
        expectedPayout = state.activeConvoy.payoutOnSuccess;
      }
    }
    expect(successfulSave).toBeDefined();

    let credited = 0;
    const restored = new BlackMarketService({
      commitCargo: () => true,
      creditSilver: (amount) => { credited += amount; return true; },
    });
    restored.load(successfulSave);
    const active = restored.getSnapshot(now, [4]).activeConvoy;
    expect(active).not.toBeNull();
    const completeAt = active!.completesAt;
    restored.getSnapshot(completeAt, [4]);
    restored.getSnapshot(completeAt + 60_000, [4]);
    expect(credited).toBe(expectedPayout);
    expect(restored.getSnapshot(completeAt + 60_000, [4]).lastResult?.silverReceived).toBe(expectedPayout);
  });

  it("keeps authored route risk/reward ordering", () => {
    const expectedValues = BLACK_MARKET_ROUTES.map((route) => (
      route.successChance * route.payoutMultiplier
    ));
    expect(expectedValues[0]).toBeLessThan(expectedValues[1]!);
    expect(expectedValues[1]).toBeLessThan(expectedValues[2]!);
  });
});
