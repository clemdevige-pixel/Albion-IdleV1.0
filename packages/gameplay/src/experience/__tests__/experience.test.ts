import { describe, expect, it } from "vitest";
import { EventBus } from "@game/core";
import { ExperienceTable } from "../experience-table.js";
import { ExperienceService } from "../experience-service.js";
import { ExperienceSaveProvider } from "../experience-save-provider.js";
import { asMasteryId } from "../types.js";
import type { ExperienceEventMap } from "../experience-events.js";

const SWORD = asMasteryId("mastery_sword");
const MINING = asMasteryId("mastery_mining");

/** Simple table: level 0->1 costs 100, 1->2 costs 200, 2->3 costs 300. */
const SIMPLE_REQ = [100, 200, 300] as const;

function makeTable(reqs: readonly number[] = SIMPLE_REQ): ExperienceTable {
  return new ExperienceTable(reqs);
}

function makeService(): ExperienceService {
  const svc = new ExperienceService();
  svc.registerMastery(SWORD, makeTable(), 3);
  return svc;
}

// ── ExperienceTable ─────────────────────────────────────────────────
describe("ExperienceTable", () => {
  it("returns required XP for each level", () => {
    const table = makeTable();
    expect(table.getRequiredXp(0)).toBe(100);
    expect(table.getRequiredXp(1)).toBe(200);
    expect(table.getRequiredXp(2)).toBe(300);
  });

  it("beyond array length uses the last entry", () => {
    const table = makeTable();
    expect(table.getRequiredXp(5)).toBe(300);
    expect(table.getRequiredXp(99)).toBe(300);
  });

  it("getLevel computes level and remaining XP", () => {
    const table = makeTable();
    expect(table.getLevel(0, 3)).toEqual({ level: 0, remainingXp: 0 });
    expect(table.getLevel(50, 3)).toEqual({ level: 0, remainingXp: 50 });
    expect(table.getLevel(100, 3)).toEqual({ level: 1, remainingXp: 0 });
    expect(table.getLevel(150, 3)).toEqual({ level: 1, remainingXp: 50 });
    expect(table.getLevel(300, 3)).toEqual({ level: 2, remainingXp: 0 });
    expect(table.getLevel(600, 3)).toEqual({ level: 3, remainingXp: 0 });
  });

  it("caps at maxLevel", () => {
    const table = makeTable();
    expect(table.getLevel(9999, 2)).toEqual({ level: 2, remainingXp: 9999 - 300 });
  });

  it("getMaxLevel returns table length", () => {
    expect(makeTable().getMaxLevel()).toBe(3);
  });

  it("throws on empty requirements", () => {
    expect(() => new ExperienceTable([])).toThrow();
  });
});

// ── ExperienceService ───────────────────────────────────────────────
describe("ExperienceService", () => {
  it("gains XP on a registered mastery", () => {
    const svc = makeService();
    const result = svc.addExperience(SWORD, 50, "combat");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.xpAdded).toBe(50);
    expect(result.value.newLevel).toBe(0);
    expect(result.value.currentXp).toBe(50);
  });

  it("detects a single level-up", () => {
    const svc = makeService();
    const result = svc.addExperience(SWORD, 100, "combat");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.levelsGained).toBe(1);
    expect(result.value.newLevel).toBe(1);
    expect(result.value.currentXp).toBe(0);
  });

  it("detects multi-level-up with overflow carry-over", () => {
    const svc = makeService();
    // 100 + 200 + 300 = 600 for 3 levels; give 650
    const result = svc.addExperience(SWORD, 650, "combat");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.levelsGained).toBe(3);
    expect(result.value.newLevel).toBe(3);
    // At max level 3, remainingXp = 650 - 600 = 50
    expect(result.value.currentXp).toBe(50);
  });

  it("ignores XP at max level", () => {
    const svc = makeService();
    svc.addExperience(SWORD, 600, "combat"); // reach max
    const result = svc.addExperience(SWORD, 100, "combat");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("max_level_reached");
  });

  it("rejects invalid amounts", () => {
    const svc = makeService();
    expect(svc.addExperience(SWORD, 0, "combat")).toEqual({ ok: false, reason: "invalid_amount" });
    expect(svc.addExperience(SWORD, -5, "combat")).toEqual({ ok: false, reason: "invalid_amount" });
    expect(svc.addExperience(SWORD, 1.5, "combat")).toEqual({
      ok: false,
      reason: "invalid_amount",
    });
  });

  it("rejects unregistered mastery", () => {
    const svc = makeService();
    const result = svc.addExperience(MINING, 10, "gathering");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("mastery_not_registered");
  });

  it("getMasteryProgress returns undefined for unknown mastery", () => {
    const svc = makeService();
    expect(svc.getMasteryProgress(MINING)).toBeUndefined();
  });

  it("getAllProgress returns all registered masteries", () => {
    const svc = new ExperienceService();
    svc.registerMastery(SWORD, makeTable(), 3);
    svc.registerMastery(MINING, makeTable(), 3);
    const all = svc.getAllProgress();
    expect(all.size).toBe(2);
    expect(all.has(SWORD)).toBe(true);
    expect(all.has(MINING)).toBe(true);
  });

  it("emits ExperienceGained and LevelUp events", () => {
    const svc = makeService();
    const bus = new EventBus<ExperienceEventMap>();
    svc.setEventBus(bus);

    const xpEvents: unknown[] = [];
    const lvlEvents: unknown[] = [];
    bus.subscribe("ExperienceGained", (e) => xpEvents.push(e));
    bus.subscribe("LevelUp", (e) => lvlEvents.push(e));

    svc.addExperience(SWORD, 150, "combat");
    expect(xpEvents).toHaveLength(1);
    expect(lvlEvents).toHaveLength(1);
  });

  it("deterministic: same inputs produce same outputs", () => {
    const run = (): unknown => {
      const svc = makeService();
      svc.addExperience(SWORD, 350, "combat");
      return svc.getMasteryProgress(SWORD);
    };
    expect(run()).toEqual(run());
  });
});

// ── Save / Load round-trip ──────────────────────────────────────────
describe("ExperienceSaveProvider", () => {
  it("round-trips save/load", () => {
    const table = makeTable();
    const svc = makeService();
    svc.addExperience(SWORD, 350, "combat");

    const provider = new ExperienceSaveProvider(svc, (id) =>
      id === SWORD ? table : undefined,
    );

    const saved = provider.save();

    // Restore into a fresh service
    const svc2 = new ExperienceService();
    const provider2 = new ExperienceSaveProvider(svc2, (id) =>
      id === SWORD ? table : undefined,
    );
    provider2.load(saved);

    expect(svc2.getMasteryProgress(SWORD)).toEqual(svc.getMasteryProgress(SWORD));
  });
});
