import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import {
  CurrencyRegistry,
  CurrencyService,
  InventoryManager,
  RelicService,
  asPlayerId,
  asWalletId,
} from "@game/gameplay";
import {
  DUNGEON_RELIC_ITEM_ID,
} from "../../data/relicContentCatalog.js";
import { RESEARCH_IDS } from "../../data/researchContentCatalog.js";
import { createResearchFoundation } from "./createResearchFoundation.js";

function setup() {
  const world = new World(createRuntimeServices());
  const inventoryManager = new InventoryManager(
    world,
    (itemId) => ({ itemId, stackable: false, maxStack: 1 }),
  );
  const heroId = world.createEntity();
  const productionStorageId = world.createEntity();
  inventoryManager.createInventory(heroId, 10);
  inventoryManager.createInventory(productionStorageId, 10);

  const registry = new CurrencyRegistry();
  registry.register({
    id: "currency_silver",
    enabled: true,
    minValue: 0,
    maxValue: null,
    acquisitionSources: ["Loot"],
    spendingSources: ["Craft"],
  });
  const currencyService = new CurrencyService(registry);
  const walletId = asWalletId("wallet_test");
  currencyService.createWallet(walletId, asPlayerId("player_test"));

  const relicService = new RelicService({
    getFactionKillCount: () => 0,
  });
  const foundation = createResearchFoundation({
    relicService,
    currencyService,
    walletId,
    inventoryManager,
    productionStorageId,
    getAcademyTier: () => 8,
    isWorldProgressionComplete: () => true,
  });

  return { foundation, inventoryManager, heroId };
}

function addLegacyRelic(
  inventoryManager: InventoryManager,
  heroId: ReturnType<World["createEntity"]>,
): void {
  const added = inventoryManager.addEntry(heroId, DUNGEON_RELIC_ITEM_ID, 0);
  if (!added.ok) throw new Error("test setup failed");
}

function expectRelicRemoved(
  inventoryManager: InventoryManager,
  heroId: ReturnType<World["createEntity"]>,
): void {
  expect(inventoryManager.findEntriesByItemId(heroId, DUNGEON_RELIC_ITEM_ID)).toHaveLength(0);
}

describe("createResearchFoundation legacy consumed-item reconciliation", () => {
  it("removes a legacy Relic when its analysis Research is already active", () => {
    const { foundation, inventoryManager, heroId } = setup();
    addLegacyRelic(inventoryManager, heroId);
    foundation.researchService.load({
      version: 2,
      completedResearchIds: [],
      activeResearches: [{
        researchId: RESEARCH_IDS.dungeonRelicAnalysis,
        remainingDurationMs: 60_000,
      }],
    });

    foundation.reconcileResearchEffects();

    expectRelicRemoved(inventoryManager, heroId);
  });

  it("removes a legacy Relic when its analysis Research is already completed", () => {
    const { foundation, inventoryManager, heroId } = setup();
    addLegacyRelic(inventoryManager, heroId);
    foundation.researchService.load({
      version: 2,
      completedResearchIds: [RESEARCH_IDS.dungeonRelicAnalysis],
      activeResearches: [],
    });

    foundation.reconcileResearchEffects();

    expectRelicRemoved(inventoryManager, heroId);
  });

  it("keeps the Relic before the consumptive Research starts", () => {
    const { foundation, inventoryManager, heroId } = setup();
    addLegacyRelic(inventoryManager, heroId);

    foundation.reconcileResearchEffects();

    expect(inventoryManager.findEntriesByItemId(heroId, DUNGEON_RELIC_ITEM_ID)).toHaveLength(1);
  });
});
