import { describe, expect, it } from "vitest";
import {
  getFactionRuneWorldDropChance,
  getFactionRuneWorldDropExpectation,
  isFactionRuneWorldDropEligibleFaction,
  rollFactionRuneWorldDrop,
} from "./factionRuneWorldDropContentCatalog.js";

describe("Faction Rune world drop content", () => {
  it("locks the tester baseline anchors", () => {
    expect(getFactionRuneWorldDropChance("blue", 3, 0)).toBeCloseTo(0.005);
    expect(getFactionRuneWorldDropChance("blue", 4, 9)).toBeCloseTo(0.0115);

    expect(getFactionRuneWorldDropChance("yellow", 0, 0)).toBeCloseTo(0.0075);
    expect(getFactionRuneWorldDropChance("yellow", 4, 9)).toBeCloseTo(0.021);

    expect(getFactionRuneWorldDropChance("orange", 0, 0)).toBeCloseTo(0.018);
    expect(getFactionRuneWorldDropChance("orange", 4, 9)).toBeCloseTo(0.043);

    expect(getFactionRuneWorldDropChance("red", 0, 0)).toBeCloseTo(0.03);
    expect(getFactionRuneWorldDropChance("red", 4, 9)).toBeCloseTo(0.083);

    expect(getFactionRuneWorldDropChance("black", 0, 0)).toBeCloseTo(0.0475);
    expect(getFactionRuneWorldDropChance("black", 3, 9)).toBeCloseTo(0.136);
    expect(getFactionRuneWorldDropChance("black", 4, 9)).toBeCloseTo(0.136);
  });

  it("does not create a T4 rune channel in the T3 blue zones", () => {
    expect(getFactionRuneWorldDropChance("blue", 0, 9)).toBe(0);
    expect(getFactionRuneWorldDropChance("blue", 1, 9)).toBe(0);
    expect(getFactionRuneWorldDropChance("blue", 2, 9)).toBe(0);
  });

  it("only exposes the common matching-tier rune for supported factions", () => {
    expect(isFactionRuneWorldDropEligibleFaction("Keeper")).toBe(true);
    expect(isFactionRuneWorldDropEligibleFaction("animal")).toBe(false);
    expect(getFactionRuneWorldDropExpectation("Morgana", 6, 0.029)).toEqual({
      itemId: "item_resource_rune_faction_t6",
      expectedQuantity: 0.029,
    });
    expect(getFactionRuneWorldDropExpectation("animal", 6, 0.029)).toBeUndefined();
  });

  it("applies Faction Mastery as bonus yield on top of the displayed base rate", () => {
    expect(rollFactionRuneWorldDrop("keeper", 5, 0.1, 50, () => 0.149)).toEqual({
      itemId: "item_resource_rune_faction_t5",
      kind: "faction_rune",
      quantity: 1,
    });
    expect(rollFactionRuneWorldDrop("keeper", 5, 0.1, 50, () => 0.151)).toBeUndefined();
  });
});
