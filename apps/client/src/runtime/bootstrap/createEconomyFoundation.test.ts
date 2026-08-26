import { describe, expect, it } from "vitest";
import {
  DAILY_MERCHANT_VENDOR_ID,
  DAILY_MERCHANT_VENDOR_OFFERS,
  GENERAL_VENDOR_FIXED_OFFERS,
  GENERAL_VENDOR_ID,
} from "@game/data";
import { EquipmentManager, InventoryManager } from "@game/gameplay";
import { resolveEquipmentInfo, resolveItemStackInfo } from "../../data/itemContentCatalog";
import { createCombatFoundation } from "./createCombatFoundation";
import { createEconomyFoundation } from "./createEconomyFoundation";

describe("createEconomyFoundation", () => {
  it("keeps fixed and rotating vendor catalogues isolated", () => {
    const combat = createCombatFoundation();
    const inventoryManager = new InventoryManager(
      combat.world,
      resolveItemStackInfo,
    );
    const equipmentManager = new EquipmentManager(
      combat.world,
      inventoryManager,
      resolveEquipmentInfo,
    );
    const economy = createEconomyFoundation({
      inventoryManager,
      equipmentManager,
    });

    const generalVendor = economy.vendorRegistry.get(GENERAL_VENDOR_ID);
    const dailyVendor = economy.vendorRegistry.get(DAILY_MERCHANT_VENDOR_ID);

    expect(generalVendor?.offers).toEqual(GENERAL_VENDOR_FIXED_OFFERS);
    expect(dailyVendor?.offers).toEqual(DAILY_MERCHANT_VENDOR_OFFERS);
    expect(generalVendor?.offers.some((offer) => offer.itemId.startsWith("item_weapon_"))).toBe(false);

    combat.orchestrator.dispose();
  });
});
