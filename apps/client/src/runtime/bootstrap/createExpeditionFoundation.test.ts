import { getFactionRuneItemId } from "@game/data";
import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import {
  CurrencyRegistry,
  CurrencyService,
  EXPEDITION_DURATION_OPTIONS_MS,
  ResearchService,
  asPlayerId,
  asWalletId,
  getEnchantmentShardItemId,
} from "@game/gameplay";
import {
  getDungeonKeyFragmentItemId,
  getDungeonKeyItemId,
} from "../../data/dungeonKeyContentCatalog.js";
import { resolveItemStackInfo } from "../../data/itemContentCatalog.js";
import {
  RESEARCH_UNLOCK_IDS,
  type ResearchContentRequirement,
} from "../../data/researchContentCatalog.js";
import { PlayerInventoryManager } from "../PlayerInventoryManager.js";
import { createExpeditionFoundation } from "./createExpeditionFoundation.js";

function createResearchService(unlocks: readonly string[]) {
  const researchService = new ResearchService<ResearchContentRequirement>({
    requirementPort: { isRequirementMet: () => true },
    paymentPort: { tryConsumeResearchCost: () => true },
  });

  unlocks.forEach((unlockId, index) => {
    const id = `test_unlock_${String(index)}`;
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
  });
  return researchService;
}

function createFoundation(unlocks: readonly string[], random: () => number = () => 0.5) {
  const world = new World(createRuntimeServices());
  const heroId = world.createEntity();
  const bankId = world.createEntity();
  const unrelatedStorageId = world.createEntity();
  const inventoryManager = new PlayerInventoryManager(world, resolveItemStackInfo);
  inventoryManager.createInventory(heroId, 8);
  inventoryManager.createInventory(bankId, 8);
  inventoryManager.createInventory(unrelatedStorageId, 8);
  inventoryManager.setAccessibleStorageOwners(heroId, [heroId, bankId]);

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
    researchService: createResearchService(unlocks),
    currencyService,
    walletId,
    inventoryManager,
    heroId,
    random,
  });

  return { ...foundation, heroId, bankId, unrelatedStorageId, inventoryManager };
}

describe("createExpeditionFoundation", () => {
  it("separates Cartography Generalist access from Archaeology Faction access", () => {
    const generalistOnly = createFoundation([RESEARCH_UNLOCK_IDS.silverExpeditionTier4]);
    expect(generalistOnly.expeditionService.getStartState("expedition_silver_t4")).toBe("available");
    expect(generalistOnly.expeditionService.getStartState("expedition_faction_t4")).toBe("requirements_locked");

    const factionOnly = createFoundation([RESEARCH_UNLOCK_IDS.factionExpeditionTier4]);
    expect(factionOnly.expeditionService.getStartState("expedition_silver_t4")).toBe("requirements_locked");
    expect(factionOnly.expeditionService.getStartState("expedition_faction_t4")).toBe("available");
  });

  it("credits centered Generalist Silver and matching-tier enchantment shards", () => {
    const {
      expeditionService,
      heroId,
      unrelatedStorageId,
      inventoryManager,
    } = createFoundation([RESEARCH_UNLOCK_IDS.silverExpeditionTier4]);

    const durationMs = EXPEDITION_DURATION_OPTIONS_MS[0];
    const shardItemId = getEnchantmentShardItemId(4);
    expect(expeditionService.startExpedition("expedition_silver_t4", durationMs).ok).toBe(true);

    const advance = expeditionService.advance(durationMs);

    expect(inventoryManager.getTotalQuantity(heroId, shardItemId)).toBe(92);
    expect(inventoryManager.getTotalQuantity(unrelatedStorageId, shardItemId)).toBe(0);
    expect(advance.completed).toHaveLength(1);
    expect(advance.completed[0]?.rewardSummary).toEqual({
      kind: "silver",
      silverCredited: 60_000,
      shardItemId,
      shardsCredited: 92,
      quality: "reussie",
    });
  });

  it("uses the bank as overflow when the hero inventory is full", () => {
    const {
      expeditionService,
      heroId,
      bankId,
      unrelatedStorageId,
      inventoryManager,
    } = createFoundation([RESEARCH_UNLOCK_IDS.silverExpeditionTier4]);

    const fillerItemIds = [
      getEnchantmentShardItemId(5),
      getEnchantmentShardItemId(6),
      getEnchantmentShardItemId(7),
      getEnchantmentShardItemId(8),
      getFactionRuneItemId(4),
      getDungeonKeyFragmentItemId(4),
      getDungeonKeyItemId(4),
      getFactionRuneItemId(5),
    ];
    for (const itemId of fillerItemIds) {
      const result = inventoryManager.addQuantity(heroId, itemId, 1);
      expect(result.ok).toBe(true);
    }

    const durationMs = EXPEDITION_DURATION_OPTIONS_MS[0];
    const shardItemId = getEnchantmentShardItemId(4);
    expect(expeditionService.startExpedition("expedition_silver_t4", durationMs).ok).toBe(true);

    const advance = expeditionService.advance(durationMs);

    expect(inventoryManager.getTotalQuantity(heroId, shardItemId)).toBe(0);
    expect(inventoryManager.getTotalQuantity(bankId, shardItemId)).toBe(92);
    expect(inventoryManager.getTotalQuantity(unrelatedStorageId, shardItemId)).toBe(0);
    expect(advance.completed).toHaveLength(1);
  });

  it("credits integer Runes, fragments and complete keys and returns recap data", () => {
    const {
      expeditionService,
      heroId,
      unrelatedStorageId,
      inventoryManager,
    } = createFoundation([RESEARCH_UNLOCK_IDS.factionExpeditionTier4]);

    const durationMs = EXPEDITION_DURATION_OPTIONS_MS[0];
    const runeItemId = getFactionRuneItemId(4);
    const fragmentItemId = getDungeonKeyFragmentItemId(4);
    const keyItemId = getDungeonKeyItemId(4);
    expect(expeditionService.startExpedition("expedition_faction_t4", durationMs).ok).toBe(true);

    const advance = expeditionService.advance(durationMs);

    expect(inventoryManager.getTotalQuantity(heroId, runeItemId)).toBe(16);
    expect(inventoryManager.getTotalQuantity(heroId, fragmentItemId)).toBe(48);
    expect(inventoryManager.getTotalQuantity(heroId, keyItemId)).toBe(3);
    expect(inventoryManager.getTotalQuantity(unrelatedStorageId, runeItemId)).toBe(0);
    expect(advance.completed).toHaveLength(1);
    expect(advance.completed[0]?.rewardSummary).toEqual({
      kind: "faction_rune",
      itemId: runeItemId,
      runesCredited: 16,
      fragmentItemId,
      fragmentsCredited: 48,
      keyItemId,
      completeKeysCredited: 3,
      quality: "reussie",
    });
    expect(Number.isInteger(advance.completed[0]?.rewardSummary.kind === "faction_rune"
      ? advance.completed[0].rewardSummary.completeKeysCredited
      : NaN)).toBe(true);
  });
});
