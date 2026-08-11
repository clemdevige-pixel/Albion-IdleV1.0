import {
  CurrencyRegistry,
  CurrencyService,
  DurabilityStore,
  EconomyEventEmitter,
  EconomyTransactionService,
  RepairCostResolver,
  RepairService,
  RepairStationRegistry,
  TransactionRegistry,
  VendorRegistry,
  VendorService,
  asPlayerId,
  asWalletId,
  type EquipmentManager,
  type InventoryManager,
} from "@game/gameplay";
import {
  GENERAL_VENDOR_FIXED_OFFERS,
  REPAIR_COST_DEFINITIONS,
} from "../../data/economyContentCatalog.js";
import {
  resolveItemStackInfo,
  resolveRepairableInfo,
} from "../../data/itemContentCatalog.js";
import { WEAPON_VENDOR_OFFERS } from "../../data/weaponContentCatalog.js";

interface EconomyFoundationDependencies {
  readonly inventoryManager: InventoryManager;
  readonly equipmentManager: EquipmentManager;
}

/** Framework-agnostic currency, vendor, durability and repair assembly. */
export function createEconomyFoundation({
  inventoryManager,
  equipmentManager,
}: EconomyFoundationDependencies) {
  const currencyRegistry = new CurrencyRegistry();
  currencyRegistry.register({
    id: "currency_silver",
    enabled: true,
    minValue: 0,
    maxValue: null,
    acquisitionSources: ["Loot", "VendorSale", "Quest"],
    spendingSources: ["Vendor", "Building", "Craft", "Worker"],
  });

  const currencyService = new CurrencyService(currencyRegistry);
  const playerId = asPlayerId("player_1");
  const walletId = asWalletId("wallet_1");
  currencyService.createWallet(walletId, playerId);
  currencyService.credit(walletId, "currency_silver", 1000, "Loot");

  const durabilityStore = new DurabilityStore();
  const repairStationRegistry = new RepairStationRegistry();
  repairStationRegistry.register({
    stationId: "station_general",
    locationType: "city",
    repairModifier: 1,
    enabled: true,
  });

  const repairCostResolver = new RepairCostResolver();
  for (const definition of REPAIR_COST_DEFINITIONS) {
    repairCostResolver.register(definition);
  }

  const repairService = new RepairService(
    repairCostResolver,
    repairStationRegistry,
    currencyService,
    inventoryManager,
    equipmentManager,
    durabilityStore,
    resolveRepairableInfo,
  );

  const vendorRegistry = new VendorRegistry();
  vendorRegistry.register({
    vendorId: "vendor_general",
    role: "buy_and_sell",
    enabled: true,
    offers: [...GENERAL_VENDOR_FIXED_OFFERS, ...WEAPON_VENDOR_OFFERS],
  });

  const vendorService = new VendorService(
    vendorRegistry,
    currencyService,
    inventoryManager,
    equipmentManager,
    resolveItemStackInfo,
  );
  const economyEvents = new EconomyEventEmitter();
  const transactionRegistry = new TransactionRegistry();
  const economyTransactionService = new EconomyTransactionService(
    currencyRegistry,
    currencyService,
    vendorService,
    repairService,
    transactionRegistry,
    economyEvents,
  );

  return {
    currencyRegistry,
    currencyService,
    playerId,
    walletId,
    durabilityStore,
    repairStationRegistry,
    repairCostResolver,
    repairService,
    vendorRegistry,
    vendorService,
    economyEvents,
    transactionRegistry,
    economyTransactionService,
  };
}

export type EconomyFoundation = ReturnType<typeof createEconomyFoundation>;
