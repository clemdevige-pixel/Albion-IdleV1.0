import {
  getFactionRuneWorldDropChance,
  getFactionRuneWorldDropExpectation,
  getFactionRuneWorldEncounterMultiplier,
  isFactionRuneWorldDropEligibleFaction,
  rollFactionRuneWorldDrop,
} from "@game/data";
import { describe, expect, it } from "vitest";

describe("Faction Rune world drop content", () => {
  it("locks the tester baseline anchors", () => {
    expect(getFactionRuneWorldDropChance("blue", 3, 0)).toBeCloseTo(0.005);
    expect(getFactionRuneWorldDropChance("blue", 4, 9)).toBeCloseTo(0.0115);

    expect(getFactionRuneWorldDropChance("yellow", 0, 0)).toBeCloseTo(0.00564);
    expect(getFactionRuneWorldDropChance("yellow", 4, 9)).toBeCloseTo(0.0158);

    expect(getFactionRuneWorldDropChance("orange", 0, 0)).toBeCloseTo(0.00904);
    expect(getFactionRuneWorldDropChance("orange", 4, 9)).toBeCloseTo(0.0216);

    expect(getFactionRuneWorldDropChance("red", 0, 0)).toBeCloseTo(0.01048);
    expect(getFactionRuneWorldDropChance("red", 4, 9)).toBeCloseTo(0.029);

    expect(getFactionRuneWorldDropChance("black", 0, 0)).toBeCloseTo(0.01373);
    expect(getFactionRuneWorldDropChance("black", 3, 9)).toBeCloseTo(0.0393);
    expect(getFactionRuneWorldDropChance("black", 4, 9)).toBeCloseTo(0.0393);
  });

  it("rewards elite and boss encounters without changing normal rates", () => {
    expect(getFactionRuneWorldEncounterMultiplier(false, false)).toBe(1);
    expect(getFactionRuneWorldEncounterMultiplier(true, false)).toBe(2.5);
    expect(getFactionRuneWorldEncounterMultiplier(false, true)).toBe(5);
    expect(getFactionRuneWorldEncounterMultiplier(true, true)).toBe(5);
  });

  it("does not create a T4 rune channel in the T3 blue zones", () => {
    expect(getFactionRuneWorldDropChance("blue", 0, 9)).toBe(0);
    expect(getFactionRuneWorldDropChance("blue", 1, 9)).toBe(0);
    expect(getFactionRuneWorldDropChance("blue", 2, 9)).toBe(0);
  });

  it("only exposes the common matching-tier rune for supported factions", () => {
    expect(isFactionRuneWorldDropEligibleFaction("Keeper")).toBe(true);
    expect(isFactionRuneWorldDropEligibleFaction("animal")).toBe(false);
    expect(getFactionRuneWorldDropExpectation("Morgana", 6, 0.0216)).toEqual({
      itemId: "item_resource_rune_faction_t6",
      expectedQuantity: 0.0216,
    });
    expect(getFactionRuneWorldDropExpectation("animal", 6, 0.0216)).toBeUndefined();
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
