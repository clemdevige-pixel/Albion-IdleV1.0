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

function createUnlockedResearchService(examinedRelicIds: readonly string[] = ["relic_keeper"]) {
  const researchService = new ResearchService<ResearchContentRequirement>({
    requirementPort: { isRequirementMet: () => true },
    paymentPort: { tryConsumeResearchCost: () => true },
  });

  expect(researchService.registerResearch({
    id: "test_cartography_t4",
    displayName: "test_cartography_t4",
    tier: 4,
    durationMs: 1,
    cost: { silver: 0, materials: [] },
    requirements: [],
    unlockIds: [RESEARCH_UNLOCK_IDS.expeditionTier4],
  }).ok).toBe(true);
  expect(researchService.startResearch("test_cartography_t4").ok).toBe(true);
  researchService.advance(1);

  return Object.assign(researchService, {
    isRelicExamined: (relicId: string) => examinedRelicIds.includes(relicId),
  });
}

function createFoundation(examinedRelicIds: readonly string[] = ["relic_keeper"]) {
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

  const foundation = createExpeditionFoundation({
    researchService: createUnlockedResearchService(examinedRelicIds),
    currencyService,
    walletId,
    inventoryManager,
    heroId,
    getFactionYieldBonusPercent: () => 25,
  });

  return { ...foundation, heroId, unrelatedStorageId, inventoryManager };
}

describe("createExpeditionFoundation", () => {
  it("requires the matching examined Relic in addition to Cartography", () => {
    const locked = createFoundation([]);
    expect(locked.expeditionService.getStartState("expedition_keeper_t4")).toBe("requirements_locked");

    const unlocked = createFoundation(["relic_keeper"]);
    expect(unlocked.expeditionService.getStartState("expedition_keeper_t4")).toBe("available");
    expect(unlocked.expeditionService.getStartState("expedition_heretic_t4")).toBe("requirements_locked");
  });

  it("credits rounded Faction Runes to the hero inventory and returns the recap data", () => {
    const {
      expeditionService,
      heroId,
      unrelatedStorageId,
      inventoryManager,
    } = createFoundation();

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
