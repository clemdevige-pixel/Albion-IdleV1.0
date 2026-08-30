import { describe, expect, it } from "vitest";
import { resolveTowerEncounter } from "./towerEncounterResolver.js";

describe("towerEncounterResolver", () => {
  it("reuses the matching T8 Keeper Dungeon normals for Tower floors 1 and 2", () => {
    const first = resolveTowerEncounter(1, "tower-encounter-seed");
    const second = resolveTowerEncounter(2, "tower-encounter-seed");

    expect(first).toMatchObject({
      status: "resolved",
      dungeonDefinitionId: "dungeon_keeper_t8",
      dungeonEncounterIndex: 0,
      encounterKind: "normal",
      floorDefinition: { floor: 1, role: "normal", block: { tier: 8, factionId: "keeper" } },
    });
    expect(second).toMatchObject({
      status: "resolved",
      dungeonDefinitionId: "dungeon_keeper_t8",
      dungeonEncounterIndex: 1,
      encounterKind: "normal",
    });
    if (first.status === "resolved") {
      expect(first.combatProfile.hp).toBeGreaterThan(0);
      expect(first.combatProfile.damage).toBeGreaterThan(0);
    }
  });

  it("does not invent a source for reinforced floors", () => {
    expect(resolveTowerEncounter(3, "tower-encounter-seed")).toMatchObject({
      status: "unresolved",
      reason: "reinforced_encounter_not_authored",
      floorDefinition: { floor: 3, role: "reinforced" },
    });
  });

  it("reuses the matching Dungeon elite and boss for floors 4 and 5", () => {
    expect(resolveTowerEncounter(4, "tower-encounter-seed")).toMatchObject({
      status: "resolved",
      dungeonDefinitionId: "dungeon_keeper_t8",
      dungeonEncounterIndex: 2,
      encounterKind: "elite",
    });
    expect(resolveTowerEncounter(5, "tower-encounter-seed")).toMatchObject({
      status: "resolved",
      dungeonDefinitionId: "dungeon_keeper_t8",
      dungeonEncounterIndex: 3,
      encounterKind: "boss",
    });
  });

  it("uses the authored faction and tier of later trial blocks", () => {
    expect(resolveTowerEncounter(21, "tower-encounter-seed")).toMatchObject({
      status: "resolved",
      dungeonDefinitionId: "dungeon_morgana_t5",
      dungeonEncounterIndex: 0,
      floorDefinition: { block: { tier: 5, factionId: "morgana" } },
    });
  });

  it("resolves endless floors through the same Dungeon catalog", () => {
    const result = resolveTowerEncounter(26, "tower-encounter-seed");
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") return;
    expect(result.dungeonDefinitionId).toBe(
      `dungeon_${result.floorDefinition.block.factionId}_t${String(result.floorDefinition.block.tier)}`,
    );
    expect(result.dungeonEncounterIndex).toBe(0);
    expect(result.encounterKind).toBe("normal");
  });
});
