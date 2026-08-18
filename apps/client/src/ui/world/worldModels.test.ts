import { describe, expect, it } from "vitest";
import {
  WORLD_BANDS,
  WORLD_BESTIARY,
  getBestiaryLoot,
} from "./worldModels";

describe("world UI models", () => {
  it("exposes the five validated world bands without inventing availability", () => {
    expect(WORLD_BANDS.map((band) => band.label)).toEqual([
      "Bleue",
      "Jaune",
      "Orange",
      "Rouge",
      "Noire",
    ]);
    expect(WORLD_BANDS.filter((band) => band.isAvailable).map((band) => band.id)).toEqual([
      "blue",
      "yellow",
      "orange",
    ]);
  });

  it("builds the bestiary only from monsters that actually appear in world encounters", () => {
    expect(WORLD_BESTIARY.length).toBeGreaterThan(0);
    expect(new Set(WORLD_BESTIARY.map((entry) => entry.faction))).toEqual(
      new Set(["Keeper", "Morgana", "Heretic", "Undead"]),
    );
    expect(WORLD_BESTIARY.every((entry) => entry.imageSrc !== undefined)).toBe(true);
    expect(WORLD_BESTIARY.some((entry) => entry.id === "monster_undead_warrior")).toBe(false);
  });

  it("derives zone-band membership from actual encounter placement", () => {
    const keeperWarrior = WORLD_BESTIARY.find((entry) => entry.id === "monster_keeper_warrior");
    expect(keeperWarrior).toBeDefined();
    expect(keeperWarrior?.bandIds).toContain("blue");
    expect(keeperWarrior?.bandIds).toContain("yellow");
    expect(keeperWarrior?.bandIds).toContain("orange");
  });

  it("exposes data-driven loot ranges from the same active combat loot rules", () => {
    const keeperWarrior = WORLD_BESTIARY.find((entry) => entry.id === "monster_keeper_warrior");
    expect(keeperWarrior).toBeDefined();
    if (keeperWarrior === undefined) return;

    const blueLoot = getBestiaryLoot(keeperWarrior, "blue");
    expect(blueLoot.some((drop) => drop.itemId === "item_health_potion")).toBe(false);
    expect(blueLoot.some((drop) => drop.itemId === "item_resource_enchantment_shard_t4")).toBe(true);
    expect(blueLoot.some((drop) => drop.itemId === "item_resource_enchantment_shard_t5")).toBe(false);
    expect(blueLoot.some((drop) => drop.maximumExpectedQuantity > drop.minimumExpectedQuantity)).toBe(true);

    const yellowLoot = getBestiaryLoot(keeperWarrior, "yellow");
    expect(yellowLoot.some((drop) => drop.itemId === "item_resource_enchantment_shard_t5")).toBe(true);
  });
});
