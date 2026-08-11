import { describe, expect, it } from "vitest";
import { EquipmentManager, InventoryManager } from "@game/gameplay";
import { resolveEquipmentInfo, resolveItemStackInfo } from "../../data/itemContentCatalog";
import { createCombatFoundation } from "./createCombatFoundation";
import { createEconomyFoundation } from "./createEconomyFoundation";

describe("createEconomyFoundation", () => {
  it("initializes the player wallet and general vendor", () => {
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
    expect(economy.vendorRegistry.get("vendor_general")).toBeDefined();

    combat.orchestrator.dispose();
  });
});
