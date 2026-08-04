import { describe, expect, it } from "vitest";
import { EventBus } from "@game/core";
import { ExperienceService } from "../../experience/experience-service.js";
import { asMasteryId } from "../../experience/types.js";
import { MasteryService } from "../mastery-service.js";
import { MasterySaveProvider } from "../mastery-save-provider.js";
import type { MasteryEventMap } from "../mastery-events.js";
import type { MasteryDefinitionLike } from "../types.js";

const SWORD_DEF: MasteryDefinitionLike = {
  id: "mastery_sword",
  category: "weapon",
  maxLevel: 3,
  experiencePerLevel: [100, 200, 300],
};

const BOW_DEF: MasteryDefinitionLike = {
  id: "mastery_bow",
  category: "weapon",
  maxLevel: 3,
  experiencePerLevel: [100, 200, 300],
};

const SWORD = asMasteryId("mastery_sword");
const BOW = asMasteryId("mastery_bow");
const UNKNOWN = asMasteryId("mastery_unknown");

function makeMasteryService(
  defs: readonly MasteryDefinitionLike[] = [SWORD_DEF, BOW_DEF],
): { mastery: MasteryService; experience: ExperienceService } {
  const experience = new ExperienceService();
  const mastery = new MasteryService(experience);
  mastery.loadDefinitions(defs);
  return { mastery, experience };
}

describe("MasteryService", () => {
  it("loadDefinitions registers masteries in ExperienceService", () => {
    const { experience } = makeMasteryService();
    const progress = experience.getMasteryProgress(SWORD);
    expect(progress).toBeDefined();
    expect(progress!.level).toBe(0);
    expect(progress!.totalLifetimeXp).toBe(0);
  });

  it("discoverMastery marks it unlocked", () => {
    const { mastery } = makeMasteryService();
    expect(mastery.isMasteryUnlocked(SWORD)).toBe(false);
    const result = mastery.discoverMastery(SWORD);
    expect(result.ok).toBe(true);
    expect(mastery.isMasteryUnlocked(SWORD)).toBe(true);
  });

  it("rejects already-unlocked mastery", () => {
    const { mastery } = makeMasteryService();
    mastery.discoverMastery(SWORD);
    const result = mastery.discoverMastery(SWORD);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("mastery_already_unlocked");
    }
  });

  it("rejects unknown mastery", () => {
    const { mastery } = makeMasteryService();
    const result = mastery.discoverMastery(UNKNOWN);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("mastery_not_found");
    }
  });

  it("getMasteryState returns correct state", () => {
    const { mastery, experience } = makeMasteryService();
    mastery.discoverMastery(SWORD);
    experience.addExperience(SWORD, 150, "combat");
    const state = mastery.getMasteryState(SWORD);
    expect(state).toBeDefined();
    expect(state!.masteryId).toBe(SWORD);
    expect(state!.isUnlocked).toBe(true);
    expect(state!.level).toBe(1);
    expect(state!.currentXp).toBe(50);
    expect(state!.totalLifetimeXp).toBe(150);
  });

  it("getMasteryState returns undefined for unknown mastery", () => {
    const { mastery } = makeMasteryService();
    expect(mastery.getMasteryState(UNKNOWN)).toBeUndefined();
  });

  it("getUnlockedMasteries returns only unlocked", () => {
    const { mastery } = makeMasteryService();
    mastery.discoverMastery(SWORD);
    const unlocked = mastery.getUnlockedMasteries();
    expect(unlocked).toHaveLength(1);
    expect(unlocked[0]).toBe(SWORD);
  });

  it("getAllMasteries returns all registered masteries", () => {
    const { mastery } = makeMasteryService();
    mastery.discoverMastery(SWORD);
    const all = mastery.getAllMasteries();
    expect(all.size).toBe(2);
    expect(all.get(SWORD)!.isUnlocked).toBe(true);
    expect(all.get(BOW)!.isUnlocked).toBe(false);
  });

  // ── Overflow ──────────────────────────────────────────────────────

  it("tracks overflow pool", () => {
    const { mastery } = makeMasteryService();
    expect(mastery.getOverflowPool()).toBe(0);
    mastery.addOverflow(100);
    expect(mastery.getOverflowPool()).toBe(100);
    mastery.addOverflow(50);
    expect(mastery.getOverflowPool()).toBe(150);
  });

  it("applies overflow conversion rate", () => {
    const { mastery } = makeMasteryService();
    mastery.setOverflowConfig({ conversionRate: 2, enabled: true });
    mastery.addOverflow(100);
    expect(mastery.getOverflowPool()).toBe(200);
  });

  it("ignores invalid overflow amounts", () => {
    const { mastery } = makeMasteryService();
    mastery.addOverflow(0);
    mastery.addOverflow(-10);
    expect(mastery.getOverflowPool()).toBe(0);
  });

  // ── Events ────────────────────────────────────────────────────────

  it("emits MasteryDiscovered event", () => {
    const { mastery } = makeMasteryService();
    const bus = new EventBus<MasteryEventMap>();
    mastery.setEventBus(bus);
    const events: unknown[] = [];
    bus.subscribe("MasteryDiscovered", (e) => events.push(e));
    mastery.discoverMastery(SWORD);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ masteryId: SWORD });
  });

  // ── Save / Restore ───────────────────────────────────────────────

  it("round-trips save and restore", () => {
    const { mastery: original } = makeMasteryService();
    original.discoverMastery(SWORD);
    original.addOverflow(42);
    original.setOverflowConfig({ conversionRate: 3, enabled: true });

    const provider = new MasterySaveProvider(original);
    const saved = provider.save();

    // Restore into a fresh service
    const { mastery: restored } = makeMasteryService();
    const restoreProvider = new MasterySaveProvider(restored);
    restoreProvider.load(saved);

    expect(restored.isMasteryUnlocked(SWORD)).toBe(true);
    expect(restored.isMasteryUnlocked(BOW)).toBe(false);
    expect(restored.getOverflowPool()).toBe(42);
    // Verify config was restored by checking conversion rate
    restored.addOverflow(10);
    expect(restored.getOverflowPool()).toBe(42 + 30); // 10 * conversionRate 3
  });
});
