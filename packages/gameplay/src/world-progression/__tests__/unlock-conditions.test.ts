import { describe, it, expect } from "vitest";
import { evaluateCondition } from "../unlock-conditions.js";
import { asZoneDefinitionId } from "../../zones/zone-types.js";
import type { UnlockCondition, UnlockEvaluationContext } from "../world-progression-types.js";

function makeContext(overrides: Partial<UnlockEvaluationContext> = {}): UnlockEvaluationContext {
  return {
    currentTier: 1,
    currentFame: 0,
    completedZones: new Set(),
    ...overrides,
  };
}

describe("evaluateCondition", () => {
  describe("tier_reached", () => {
    const condition: UnlockCondition = { type: "tier_reached", requiredTier: 3 };

    it("returns false when tier is below required", () => {
      expect(evaluateCondition(condition, makeContext({ currentTier: 2 }))).toBe(false);
    });

    it("returns true when tier equals required", () => {
      expect(evaluateCondition(condition, makeContext({ currentTier: 3 }))).toBe(true);
    });

    it("returns true when tier exceeds required", () => {
      expect(evaluateCondition(condition, makeContext({ currentTier: 5 }))).toBe(true);
    });

    it("returns false when requiredTier is undefined", () => {
      const c: UnlockCondition = { type: "tier_reached" };
      expect(evaluateCondition(c, makeContext({ currentTier: 99 }))).toBe(false);
    });
  });

  describe("zone_completed", () => {
    const targetId = asZoneDefinitionId("forest");
    const condition: UnlockCondition = { type: "zone_completed", targetZoneDefId: targetId };

    it("returns false when zone not completed", () => {
      expect(evaluateCondition(condition, makeContext())).toBe(false);
    });

    it("returns true when zone is completed", () => {
      expect(
        evaluateCondition(condition, makeContext({ completedZones: new Set([targetId]) })),
      ).toBe(true);
    });

    it("returns false when targetZoneDefId is undefined", () => {
      const c: UnlockCondition = { type: "zone_completed" };
      expect(evaluateCondition(c, makeContext())).toBe(false);
    });
  });

  describe("fame_reached", () => {
    const condition: UnlockCondition = { type: "fame_reached", requiredFame: 1000 };

    it("returns false when fame is below required", () => {
      expect(evaluateCondition(condition, makeContext({ currentFame: 500 }))).toBe(false);
    });

    it("returns true when fame meets required", () => {
      expect(evaluateCondition(condition, makeContext({ currentFame: 1000 }))).toBe(true);
    });

    it("returns false when requiredFame is undefined", () => {
      const c: UnlockCondition = { type: "fame_reached" };
      expect(evaluateCondition(c, makeContext({ currentFame: 99999 }))).toBe(false);
    });
  });

  describe("manual", () => {
    it("always returns false", () => {
      const condition: UnlockCondition = { type: "manual" };
      expect(evaluateCondition(condition, makeContext({ currentTier: 99, currentFame: 99999 }))).toBe(false);
    });
  });

  describe("combined conditions", () => {
    it("all conditions must be met for a multi-condition check", () => {
      const targetId = asZoneDefinitionId("swamp");
      const conditions: UnlockCondition[] = [
        { type: "tier_reached", requiredTier: 4 },
        { type: "zone_completed", targetZoneDefId: targetId },
      ];

      const ctx1 = makeContext({ currentTier: 4 });
      expect(conditions.every((c) => evaluateCondition(c, ctx1))).toBe(false);

      const ctx2 = makeContext({ currentTier: 4, completedZones: new Set([targetId]) });
      expect(conditions.every((c) => evaluateCondition(c, ctx2))).toBe(true);
    });
  });
});
