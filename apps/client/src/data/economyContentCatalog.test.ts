import { describe, expect, it } from "vitest";
import {
  ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE,
  BLUE_ZONE_SEGMENT_LOOT_MULTIPLIERS,
  KEY_FRAGMENTS_PER_KEY,
  getBlueZoneSegmentLootMultiplier,
  rollBlueZoneCombatDrops,
} from "./economyContentCatalog";

describe("Blue Zone combat loot", () => {
  it("uses the approved segment 1 to 10 progression curve", () => {
    expect(BLUE_ZONE_SEGMENT_LOOT_MULTIPLIERS).toEqual([
      1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4, 1.5,
    ]);
    expect(getBlueZoneSegmentLootMultiplier(0)).toBe(1);
    expect(getBlueZoneSegmentLootMultiplier(9)).toBe(1.5);
  });

  it("keeps the approved fragment conversion targets", () => {
    expect(KEY_FRAGMENTS_PER_KEY).toBe(50);
    expect(ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE).toBe(200);
  });

  it("allows independent regular drops on the same kill", () => {
    const drops = rollBlueZoneCombatDrops(
      { segmentIndex: 0, faction: "Morgana", isBoss: false, isFinalBoss: false },
      () => 0,
    );

    expect(drops.map((drop) => drop.kind)).toEqual([
      "consumable",
      "enchantment",
      "enchantment",
      "enchantment",
      "key_fragment",
      "key",
    ]);
  });

  it("uses faction only to select dungeon loot identity", () => {
    const morgana = rollBlueZoneCombatDrops(
      { segmentIndex: 0, faction: "Morgana", isBoss: false, isFinalBoss: false },
      () => 0,
    );
    const keeper = rollBlueZoneCombatDrops(
      { segmentIndex: 0, faction: "Keeper", isBoss: false, isFinalBoss: false },
      () => 0,
    );

    expect(morgana.find((drop) => drop.kind === "key_fragment")?.itemId)
      .toBe("item_resource_key_fragment_morgana");
    expect(keeper.find((drop) => drop.kind === "key_fragment")?.itemId)
      .toBe("item_resource_key_fragment_keeper");
  });

  it("never drops artifacts from normal monsters", () => {
    const drops = rollBlueZoneCombatDrops(
      { segmentIndex: 9, faction: "Undead", isBoss: false, isFinalBoss: false },
      () => 0,
    );

    expect(drops.some((drop) => drop.kind === "artifact_fragment")).toBe(false);
    expect(drops.some((drop) => drop.kind === "artifact")).toBe(false);
  });

  it("enables faction-specific artifact rolls for bosses", () => {
    const drops = rollBlueZoneCombatDrops(
      { segmentIndex: 9, faction: "Keeper", isBoss: true, isFinalBoss: true },
      () => 0,
    );

    expect(drops.find((drop) => drop.kind === "artifact_fragment")?.itemId)
      .toBe("item_resource_artifact_fragment_keeper");
    expect(drops.find((drop) => drop.kind === "artifact")?.itemId)
      .toBe("item_resource_artifact_keeper");
  });
});
