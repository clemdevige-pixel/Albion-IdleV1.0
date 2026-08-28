import { describe, expect, it } from "vitest";
import { EventBus } from "@game/core";
import { ExperienceTable } from "../../experience/experience-table.js";
import { ExperienceService } from "../../experience/experience-service.js";
import { asMasteryId } from "../../experience/types.js";
import { FameService } from "../fame-service.js";
import { FameSaveProvider } from "../fame-save-provider.js";
import type { FameEventMap } from "../fame-events.js";

const SWORD = asMasteryId("mastery_sword");
const BOW = asMasteryId("mastery_bow");
const UNREGISTERED = asMasteryId("mastery_unknown");

/** Simple table: level 0->1 costs 100, 1->2 costs 200, 2->3 costs 300. */
function makeTable(): ExperienceTable {
  return new ExperienceTable([100, 200, 300]);
}

function makeServices(): { exp: ExperienceService; fame: FameService } {
  const exp = new ExperienceService();
  exp.registerMastery(SWORD, makeTable(), 3);
  exp.registerMastery(BOW, makeTable(), 3);
  const fame = new FameService(exp);
  return { exp, fame };
}

// ── Fame award delegation ───────────────────────────────────────────
describe("FameService.awardFame", () => {
  it("delegates to ExperienceService and returns correct result", () => {
    const { fame } = makeServices();
    const result = fame.awardFame({
      targetMasteryId: SWORD,
      amount: 150,
      category: "combat",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.masteryId).toBe(SWORD);
    expect(result.value.fameAwarded).toBe(150);
    expect(result.value.previousLevel).toBe(0);
    expect(result.value.newLevel).toBe(1);
    expect(result.value.levelsGained).toBe(1);
  });

  it("tracks per-mastery totals", () => {
    const { fame } = makeServices();
    fame.awardFame({ targetMasteryId: SWORD, amount: 50, category: "combat" });
    fame.awardFame({ targetMasteryId: SWORD, amount: 30, category: "combat" });
    fame.awardFame({ targetMasteryId: BOW, amount: 20, category: "combat" });

    expect(fame.getTotalFameEarned(SWORD)).toBe(80);
    expect(fame.getTotalFameEarned(BOW)).toBe(20);
    expect(fame.getTotalFameEarned()).toBe(100);
  });

  it("rejects invalid amounts", () => {
    const { fame } = makeServices();

    const r1 = fame.awardFame({ targetMasteryId: SWORD, amount: 0, category: "combat" });
    expect(r1).toEqual({ ok: false, reason: "invalid_amount" });

    const r2 = fame.awardFame({ targetMasteryId: SWORD, amount: -5, category: "combat" });
    expect(r2).toEqual({ ok: false, reason: "invalid_amount" });

    const r3 = fame.awardFame({ targetMasteryId: SWORD, amount: 1.5, category: "combat" });
    expect(r3).toEqual({ ok: false, reason: "invalid_amount" });
  });

  it("rejects unregistered mastery", () => {
    const { fame } = makeServices();
    const result = fame.awardFame({
      targetMasteryId: UNREGISTERED,
      amount: 50,
      category: "combat",
    });
    expect(result).toEqual({ ok: false, reason: "mastery_not_found" });
  });

  it("rejects fame at max level", () => {
    const { fame } = makeServices();
    // Fill to max: 100 + 200 + 300 = 600
    fame.awardFame({ targetMasteryId: SWORD, amount: 600, category: "combat" });
    const result = fame.awardFame({
      targetMasteryId: SWORD,
      amount: 1,
      category: "combat",
    });
    expect(result).toEqual({ ok: false, reason: "max_level_reached" });
  });
});

// ── History tracking ────────────────────────────────────────────────
describe("FameService.history", () => {
  it("records fame gains in order", () => {
    const { fame } = makeServices();
    fame.awardFame({ targetMasteryId: SWORD, amount: 50, category: "combat" });
    fame.awardFame({ targetMasteryId: BOW, amount: 30, category: "gathering" });

    const history = fame.getFameHistory();
    expect(history).toHaveLength(2);
    expect(history[0]!.masteryId).toBe(SWORD);
    expect(history[0]!.fameEarned).toBe(50);
    expect(history[0]!.category).toBe("combat");
    expect(history[1]!.masteryId).toBe(BOW);
    expect(history[1]!.category).toBe("gathering");
  });

  it("clearHistory resets history and totals", () => {
    const { fame } = makeServices();
    fame.awardFame({ targetMasteryId: SWORD, amount: 50, category: "combat" });
    fame.clearHistory();

    expect(fame.getFameHistory()).toHaveLength(0);
    expect(fame.getTotalFameEarned(SWORD)).toBe(0);
    expect(fame.getTotalFameEarned()).toBe(0);
  });
});

// ── Save/restore round-trip ─────────────────────────────────────────
describe("FameSaveProvider", () => {
  it("round-trips totals without persisting unbounded history", () => {
    const { fame } = makeServices();
    fame.awardFame({ targetMasteryId: SWORD, amount: 50, category: "combat" });
    fame.awardFame({ targetMasteryId: BOW, amount: 30, category: "gathering" });

    const provider = new FameSaveProvider(fame);
    const saved = provider.save();
    expect(saved).toEqual({
      totals: [
        { masteryId: BOW, total: 30 },
        { masteryId: SWORD, total: 50 },
      ],
    });

    // Create fresh services and restore
    const { fame: fame2 } = makeServices();
    const provider2 = new FameSaveProvider(fame2);
    provider2.load(saved);

    expect(fame2.getTotalFameEarned(SWORD)).toBe(50);
    expect(fame2.getTotalFameEarned(BOW)).toBe(30);
    expect(fame2.getFameHistory()).toHaveLength(0);
  });

  it("compacts legacy persisted history while preserving totals", () => {
    const { fame } = makeServices();
    const provider = new FameSaveProvider(fame);

    provider.load({
      totals: [{ masteryId: SWORD, total: 80 }],
      history: [
        { masteryId: SWORD, fameEarned: 50, category: "combat", timestamp: 0 },
        { masteryId: SWORD, fameEarned: 30, category: "combat", timestamp: 0 },
      ],
    });

    expect(fame.getTotalFameEarned(SWORD)).toBe(80);
    expect(fame.getFameHistory()).toHaveLength(0);
    expect(provider.save()).toEqual({
      totals: [{ masteryId: SWORD, total: 80 }],
    });
  });
});

// ── Events ──────────────────────────────────────────────────────────
describe("FameService events", () => {
  it("emits FameAwarded on successful fame gain", () => {
    const { fame } = makeServices();
    const bus = new EventBus<FameEventMap>();
    fame.setEventBus(bus);

    const events: unknown[] = [];
    bus.subscribe("FameAwarded", (e) => events.push(e));

    fame.awardFame({ targetMasteryId: SWORD, amount: 150, category: "combat" });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      masteryId: SWORD,
      amount: 150,
      category: "combat",
      previousLevel: 0,
      newLevel: 1,
    });
  });

  it("emits FameMilestone every 1000 fame", () => {
    // Use a big table so we can reach 1000 fame without hitting max level
    const bigTable = new ExperienceTable([500, 500, 500, 500]);
    const exp = new ExperienceService();
    exp.registerMastery(SWORD, bigTable, 4);
    const fame = new FameService(exp);
    const bus = new EventBus<FameEventMap>();
    fame.setEventBus(bus);

    const milestones: unknown[] = [];
    bus.subscribe("FameMilestone", (e) => milestones.push(e));

    fame.awardFame({ targetMasteryId: SWORD, amount: 500, category: "combat" });
    expect(milestones).toHaveLength(0);

    fame.awardFame({ targetMasteryId: SWORD, amount: 500, category: "combat" });
    expect(milestones).toHaveLength(1);
    expect(milestones[0]).toEqual({
      masteryId: SWORD,
      totalFame: 1000,
      milestone: 1000,
    });
  });

  it("does not emit events on failure", () => {
    const { fame } = makeServices();
    const bus = new EventBus<FameEventMap>();
    fame.setEventBus(bus);

    const events: unknown[] = [];
    bus.subscribe("FameAwarded", (e) => events.push(e));

    fame.awardFame({ targetMasteryId: UNREGISTERED, amount: 50, category: "combat" });
    expect(events).toHaveLength(0);
  });
});

// ── Category mapping ────────────────────────────────────────────────
describe("FameCategory to ExperienceSource mapping", () => {
  it("all categories work correctly", () => {
    const categories = ["combat", "gathering", "crafting", "exploration"] as const;

    for (const category of categories) {
      const { fame: f } = makeServices();
      const result = f.awardFame({
        targetMasteryId: SWORD,
        amount: 10,
        category,
      });
      expect(result.ok).toBe(true);
    }
  });
});
