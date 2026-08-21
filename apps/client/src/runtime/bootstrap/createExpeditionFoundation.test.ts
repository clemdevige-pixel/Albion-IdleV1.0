import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import {
  CurrencyRegistry,
  CurrencyService,
  EXPEDITION_DURATION_OPTIONS_MS,
  InventoryManager,
  ResearchService,
  asPlayerId,
  asWalletId,
} from "@game/gameplay";
import { resolveItemStackInfo } from "../../data/itemContentCatalog.js";
import {
  RESEARCH_UNLOCK_IDS,
  type ResearchContentRequirement,
} from "../../data/researchContentCatalog.js";
import { createExpeditionFoundation } from "./createExpeditionFoundation.js";

function createUnlockedResearchService() {
  const researchService = new ResearchService<ResearchContentRequirement>({
    requirementPort: { isRequirementMet: () => true },
    paymentPort: { tryConsumeResearchCost: () => true },
  });

  for (const [id, unlockId] of [
    ["test_keeper_family", RESEARCH_UNLOCK_IDS.keeperExpeditionFamily],
    ["test_cartography_t4", RESEARCH_UNLOCK_IDS.expeditionTier4],
  ] as const) {
    expect(researchService.registerResearch({
      id,
      displayName: id,
      tier: 4,
      durationMs: 1,
      cost: { silver: 0, materials: [] },
      requirements: [],
      unlockIds: [unlockId],
    }).ok).toBe(true);
    expect(researchService.startResearch(id).ok).toBe(true);
    researchService.advance(1);
  }

  return researchService;
}

describe("createExpeditionFoundation", () => {
  it("credits rounded Faction Runes to the hero inventory and returns the recap data", () => {
    const world = new World(createRuntimeServices());
    const heroId = world.createEntity();
    const unrelatedStorageId = world.createEntity();
    const inventoryManager = new InventoryManager(world, resolveItemStackInfo);
    inventoryManager.createInventory(heroId, 8);
    inventoryManager.createInventory(unrelatedStorageId, 8);

    const registry = new CurrencyRegistry();
    expect(registry.register({
      id: "currency_silver",
      enabled: true,
      minValue: 0,
      maxValue: null,
    }).ok).toBe(true);
    const currencyService = new CurrencyService(registry);
    const walletId = asWalletId("wallet_test");
    expect(currencyService.createWallet(walletId, asPlayerId("player_test")).ok).toBe(true);

    const { expeditionService } = createExpeditionFoundation({
      researchService: createUnlockedResearchService(),
      currencyService,
      walletId,
      inventoryManager,
      heroId,
      getFactionYieldBonusPercent: () => 25,
    });

    const durationMs = EXPEDITION_DURATION_OPTIONS_MS[0];
    expect(expeditionService.startExpedition("expedition_keeper_t4", durationMs).ok).toBe(true);

    const advance = expeditionService.advance(durationMs);

    expect(inventoryManager.getTotalQuantity(heroId, "item_resource_rune_keeper_t4")).toBe(3);
    expect(inventoryManager.getTotalQuantity(
      unrelatedStorageId,
      "item_resource_rune_keeper_t4",
    )).toBe(0);
    expect(advance.completed).toHaveLength(1);
    expect(advance.completed[0]?.rewardSummary).toEqual({
      kind: "faction_rune",
      factionId: "keeper",
      itemId: "item_resource_rune_keeper_t4",
      baseRunes: 2,
      masteryBonusPercent: 25,
      finalRunes: 3,
    });
  });
});
