import { describe, expect, it } from "vitest";
import type { InventorySlotVM } from "../../game/GameBridge";
import { findFirstEmptyBankTabPosition } from "./BankModule.js";

function slot(position: number, itemId?: string): InventorySlotVM {
  return {
    position,
    itemId,
    instanceId: itemId === undefined ? undefined : `instance-${String(position)}`,
    quantity: itemId === undefined ? 0 : 1,
    enchantment: 0,
  };
}

describe("findFirstEmptyBankTabPosition", () => {
  it("returns the first free position inside the requested bank tab", () => {
    const slots = [
      slot(0, "item-a"),
      slot(1),
      slot(2, "item-b"),
      slot(3, "item-c"),
      slot(4),
      slot(5),
    ];

    expect(findFirstEmptyBankTabPosition(slots, 2, 3)).toBe(4);
  });

  it("does not return a free position from another tab", () => {
    const slots = [
      slot(0),
      slot(1),
      slot(2),
      slot(3, "item-a"),
      slot(4, "item-b"),
      slot(5, "item-c"),
    ];

    expect(findFirstEmptyBankTabPosition(slots, 2, 3)).toBeUndefined();
  });

  it("rejects invalid tab coordinates", () => {
    expect(findFirstEmptyBankTabPosition([], 0, 3)).toBeUndefined();
    expect(findFirstEmptyBankTabPosition([], 1, 0)).toBeUndefined();
  });
});
