import { describe, expect, it } from "vitest";
import { GENERAL_VENDOR_FIXED_OFFERS } from "@game/data";
import { EquipmentManager, InventoryManager } from "@game/gameplay";
import { resolveEquipmentInfo, resolveItemStackInfo } from "../../data/itemContentCatalog";
import { createCombatFoundation } from "./createCombatFoundation";
import { createEconomyFoundation } from "./createEconomyFoundation";

describe("createEconomyFoundation", () => {
  it("initializes the player wallet and general vendor with fixed offers only", () => {
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

    expect(
      economy.currencyService.getBalance(
        economy.walletId,
        "currency_silver",
      ),
    ).toEqual({ ok: true, value: 1000 });

    const vendor = economy.vendorRegistry.get("vendor_general");
    expect(vendor).toBeDefined();
    expect(vendor?.offers).toEqual(GENERAL_VENDOR_FIXED_OFFERS);
    expect(vendor?.offers.some((offer) => offer.itemId.startsWith("item_weapon_"))).toBe(false);

    combat.orchestrator.dispose();
  });
});
