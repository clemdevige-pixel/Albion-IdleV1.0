import { beforeEach, describe, expect, it } from "vitest";
import {
  getCombatPresentationDamageEventCutoff,
  getCombatPresentationGeneration,
  invalidateCombatPresentation,
  resetCombatPresentationSession,
} from "./CombatPresentationInvalidation";

describe("CombatPresentationInvalidation", () => {
  beforeEach(() => {
    resetCombatPresentationSession(0);
  });

  it("keeps encounter invalidation cutoff monotonic inside one presentation session", () => {
    invalidateCombatPresentation(12);
    invalidateCombatPresentation(4);

    expect(getCombatPresentationDamageEventCutoff()).toBe(12);
  });

  it("allows a fresh bridge session to lower the cutoff when damage ids restart", () => {
    invalidateCombatPresentation(27);
    const generationBeforeReset = getCombatPresentationGeneration();

    resetCombatPresentationSession(0);

    expect(getCombatPresentationDamageEventCutoff()).toBe(0);
    expect(getCombatPresentationGeneration()).toBe(generationBeforeReset + 1);
  });

  it("uses an existing bridge latest damage id as the baseline on presentation remount", () => {
    resetCombatPresentationSession(9);

    expect(getCombatPresentationDamageEventCutoff()).toBe(9);
  });
});
