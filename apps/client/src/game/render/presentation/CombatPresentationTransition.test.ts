import { describe, expect, it } from "vitest";
import { resolveCombatPresentationTransition } from "./CombatPresentationTransition";

describe("combat presentation transition policy", () => {
  it("initializes the first encounter presentation", () => {
    expect(resolveCombatPresentationTransition({
      previousCombatState: undefined,
      nextCombatState: "combat",
      previousEncounterKey: undefined,
      nextEncounterKey: "zone:1:1",
    })).toBe("initialize");
  });

  it.each(["defeat", "idle", "walking", "paused"] as const)(
    "hard-resets when combat restarts from %s",
    (previousCombatState) => {
      expect(resolveCombatPresentationTransition({
        previousCombatState,
        nextCombatState: "combat",
        previousEncounterKey: "zone:1:1",
        nextEncounterKey: "zone:2:1",
      })).toBe("hard_reset");
    },
  );

  it("hard-resets pause/resume even when the encounter key did not change", () => {
    expect(resolveCombatPresentationTransition({
      previousCombatState: "idle",
      nextCombatState: "combat",
      previousEncounterKey: "zone:2:1",
      nextEncounterKey: "zone:2:1",
    })).toBe("hard_reset");
  });

  it("hard-resets immediately when the player changes encounter while defeated", () => {
    expect(resolveCombatPresentationTransition({
      previousCombatState: "defeat",
      nextCombatState: "defeat",
      previousEncounterKey: "zone:1:1",
      nextEncounterKey: "zone:2:1",
    })).toBe("hard_reset");
  });

  it("hard-resets when defeat transitions to walking before the replacement spawn", () => {
    expect(resolveCombatPresentationTransition({
      previousCombatState: "defeat",
      nextCombatState: "walking",
      previousEncounterKey: "zone:1:1",
      nextEncounterKey: "zone:1:1",
    })).toBe("hard_reset");
  });

  it("hard-resets explicit travel out of an active encounter", () => {
    expect(resolveCombatPresentationTransition({
      previousCombatState: "combat",
      nextCombatState: "walking",
      previousEncounterKey: "zone:1:1",
      nextEncounterKey: "zone:1:1",
    })).toBe("hard_reset");
  });

  it("hard-resets paused travel before combat resumes", () => {
    expect(resolveCombatPresentationTransition({
      previousCombatState: "idle",
      nextCombatState: "idle",
      previousEncounterKey: "zone:1:1",
      nextEncounterKey: "zone:2:1",
    })).toBe("hard_reset");
  });

  it("preserves the victory handoff when the next encounter key arrives", () => {
    expect(resolveCombatPresentationTransition({
      previousCombatState: "victory",
      nextCombatState: "combat",
      previousEncounterKey: "zone:1:1",
      nextEncounterKey: "zone:1:2",
    })).toBe("victory_handoff");
  });

  it("preserves an asynchronous victory key change before combat restarts", () => {
    expect(resolveCombatPresentationTransition({
      previousCombatState: "victory",
      nextCombatState: "victory",
      previousEncounterKey: "zone:1:1",
      nextEncounterKey: "zone:1:2",
    })).toBe("victory_handoff");
  });

  it("does nothing while the same encounter remains active", () => {
    expect(resolveCombatPresentationTransition({
      previousCombatState: "combat",
      nextCombatState: "combat",
      previousEncounterKey: "zone:1:1",
      nextEncounterKey: "zone:1:1",
    })).toBe("none");
  });
});
