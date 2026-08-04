import { describe, it, expect, beforeEach, vi } from "vitest";
import type { EntityId } from "@game/core";
import { EffectManager } from "../effect-manager.js";
import type {
  StatusEffectDefinition,
  ActiveStatusEffect,
} from "../types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HERO = 1 as EntityId;
const ENEMY = 2 as EntityId;
const ENEMY2 = 3 as EntityId;

function makeDef(overrides: Partial<StatusEffectDefinition> = {}): StatusEffectDefinition {
  return {
    id: "test_effect",
    effectType: "buff",
    duration: 5,
    strength: 10,
    refreshOnReapply: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EffectManager", () => {
  let mgr: EffectManager;

  beforeEach(() => {
    mgr = new EffectManager();
  });

  // -- Apply ----------------------------------------------------------------

  it("applies a buff with modifier", () => {
    const def = makeDef({ modifierCategory: "damage" });
    const result = mgr.applyEffect(ENEMY, HERO, def, 0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.effectType).toBe("buff");
    expect(result.value.remainingDuration).toBe(5);
    expect(result.value.strength).toBe(10);
  });

  it("applies a debuff", () => {
    const def = makeDef({ effectType: "debuff", modifierCategory: "armor" });
    const result = mgr.applyEffect(ENEMY, HERO, def, 0);
    expect(result.ok).toBe(true);
  });

  it.each(["stun", "root", "slow", "silence"] as const)("applies %s", (type) => {
    const def = makeDef({ effectType: type });
    const result = mgr.applyEffect(ENEMY, HERO, def, 0);
    expect(result.ok).toBe(true);
  });

  // -- Duration -------------------------------------------------------------

  it("decreases duration on tick", () => {
    mgr.applyEffect(ENEMY, HERO, makeDef({ duration: 10 }), 0);
    mgr.tickEffects(3);
    const effects = mgr.getActiveEffects(HERO);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.remainingDuration).toBe(7);
  });

  it("expires effect when duration reaches 0", () => {
    mgr.applyEffect(ENEMY, HERO, makeDef({ duration: 5 }), 0);
    const expired = mgr.tickEffects(5);
    expect(expired).toHaveLength(1);
    expect(mgr.getActiveEffects(HERO)).toHaveLength(0);
  });

  // -- Refresh --------------------------------------------------------------

  it("refreshes duration on reapply (same type + same source)", () => {
    const def = makeDef({ duration: 5, strength: 10 });
    mgr.applyEffect(ENEMY, HERO, def, 0);
    mgr.tickEffects(3); // remaining = 2
    const result = mgr.applyEffect(ENEMY, HERO, def, 3);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.remainingDuration).toBe(5); // refreshed
    expect(mgr.getActiveEffects(HERO)).toHaveLength(1); // no stacking
  });

  it("keeps highest strength on refresh", () => {
    mgr.applyEffect(ENEMY, HERO, makeDef({ strength: 10 }), 0);
    const result = mgr.applyEffect(ENEMY, HERO, makeDef({ strength: 15 }), 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.strength).toBe(15);
  });

  it("does not stack — strength does not accumulate", () => {
    mgr.applyEffect(ENEMY, HERO, makeDef({ strength: 10 }), 0);
    mgr.applyEffect(ENEMY, HERO, makeDef({ strength: 8 }), 1);
    const effects = mgr.getActiveEffects(HERO);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.strength).toBe(10); // keeps max
  });

  // -- Coexistence ----------------------------------------------------------

  it("allows different effect types to coexist", () => {
    mgr.applyEffect(ENEMY, HERO, makeDef({ effectType: "buff", id: "a" }), 0);
    mgr.applyEffect(ENEMY, HERO, makeDef({ effectType: "slow", id: "b" }), 0);
    mgr.applyEffect(ENEMY, HERO, makeDef({ effectType: "silence", id: "c" }), 0);
    expect(mgr.getActiveEffects(HERO)).toHaveLength(3);
  });

  it("allows different sources of same type to coexist", () => {
    const def = makeDef({ effectType: "debuff" });
    mgr.applyEffect(ENEMY, HERO, def, 0);
    mgr.applyEffect(ENEMY2, HERO, def, 0);
    expect(mgr.getActiveEffects(HERO)).toHaveLength(2);
  });

  // -- Removal --------------------------------------------------------------

  it("removeAllEffects clears target", () => {
    mgr.applyEffect(ENEMY, HERO, makeDef({ effectType: "buff" }), 0);
    mgr.applyEffect(ENEMY, HERO, makeDef({ effectType: "stun" }), 0);
    mgr.removeAllEffects(HERO);
    expect(mgr.getActiveEffects(HERO)).toHaveLength(0);
  });

  it("removeEffect removes a specific effect", () => {
    const result = mgr.applyEffect(ENEMY, HERO, makeDef(), 0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const removeResult = mgr.removeEffect(HERO, result.value.id);
    expect(removeResult.ok).toBe(true);
    expect(mgr.getActiveEffects(HERO)).toHaveLength(0);
  });

  // -- Queries --------------------------------------------------------------

  it("isStunned returns true when stunned", () => {
    mgr.applyEffect(ENEMY, HERO, makeDef({ effectType: "stun" }), 0);
    expect(mgr.isStunned(HERO)).toBe(true);
    expect(mgr.isRooted(HERO)).toBe(false);
  });

  it("isRooted returns true when rooted", () => {
    mgr.applyEffect(ENEMY, HERO, makeDef({ effectType: "root" }), 0);
    expect(mgr.isRooted(HERO)).toBe(true);
  });

  it("isSilenced returns true when silenced", () => {
    mgr.applyEffect(ENEMY, HERO, makeDef({ effectType: "silence" }), 0);
    expect(mgr.isSilenced(HERO)).toBe(true);
  });

  // -- Modifiers ------------------------------------------------------------

  it("getModifiers returns correct values", () => {
    mgr.applyEffect(ENEMY, HERO, makeDef({ modifierCategory: "damage", strength: 10 }), 0);
    mgr.applyEffect(ENEMY2, HERO, makeDef({ effectType: "debuff", modifierCategory: "damage", strength: 3 }), 0);
    const mods = mgr.getModifiers(HERO, "damage");
    expect(mods).toHaveLength(2);
  });

  it("calculateModifiedValue applies buff and debuff additively", () => {
    mgr.applyEffect(ENEMY, HERO, makeDef({ effectType: "buff", modifierCategory: "damage", strength: 10 }), 0);
    mgr.applyEffect(ENEMY2, HERO, makeDef({ effectType: "debuff", modifierCategory: "damage", strength: 3 }), 0);
    expect(mgr.calculateModifiedValue(100, HERO, "damage")).toBe(107);
  });

  // -- Validation -----------------------------------------------------------

  it("rejects negative duration", () => {
    const result = mgr.applyEffect(ENEMY, HERO, makeDef({ duration: -1 }), 0);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("invalid_duration");
  });

  it("rejects zero duration", () => {
    const result = mgr.applyEffect(ENEMY, HERO, makeDef({ duration: 0 }), 0);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("invalid_duration");
  });

  it("rejects negative strength", () => {
    const result = mgr.applyEffect(ENEMY, HERO, makeDef({ strength: -5 }), 0);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("invalid_effect");
  });

  // -- Events ---------------------------------------------------------------

  it("emits StatusApplied on apply", () => {
    const handler = vi.fn();
    mgr.events.subscribe("StatusApplied", handler);
    mgr.applyEffect(ENEMY, HERO, makeDef(), 0);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("emits StatusRefreshed on refresh", () => {
    const handler = vi.fn();
    mgr.events.subscribe("StatusRefreshed", handler);
    mgr.applyEffect(ENEMY, HERO, makeDef(), 0);
    mgr.applyEffect(ENEMY, HERO, makeDef(), 1);
    expect(handler).toHaveBeenCalledOnce();
    expect((handler.mock.calls[0]![0] as { previousDuration: number }).previousDuration).toBe(5);
  });

  it("emits StatusExpired when effect expires", () => {
    const handler = vi.fn();
    mgr.events.subscribe("StatusExpired", handler);
    mgr.applyEffect(ENEMY, HERO, makeDef({ duration: 3 }), 0);
    mgr.tickEffects(3);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("emits StatusRemoved on explicit removal", () => {
    const handler = vi.fn();
    mgr.events.subscribe("StatusRemoved", handler);
    const result = mgr.applyEffect(ENEMY, HERO, makeDef(), 0);
    if (!result.ok) return;
    mgr.removeEffect(HERO, result.value.id);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("emits StatusRemoved for each effect on removeAllEffects", () => {
    const handler = vi.fn();
    mgr.events.subscribe("StatusRemoved", handler);
    mgr.applyEffect(ENEMY, HERO, makeDef({ effectType: "buff" }), 0);
    mgr.applyEffect(ENEMY, HERO, makeDef({ effectType: "stun" }), 0);
    mgr.removeAllEffects(HERO);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  // -- Determinism ----------------------------------------------------------

  it("produces identical state for identical sequences", () => {
    function runSequence(): readonly ActiveStatusEffect[] {
      const m = new EffectManager();
      m.applyEffect(ENEMY, HERO, makeDef({ effectType: "buff", duration: 10, strength: 5 }), 0);
      m.applyEffect(ENEMY2, HERO, makeDef({ effectType: "debuff", duration: 8, strength: 3 }), 1);
      m.tickEffects(2);
      m.applyEffect(ENEMY, HERO, makeDef({ effectType: "buff", duration: 10, strength: 7 }), 3);
      m.tickEffects(1);
      return m.getActiveEffects(HERO);
    }

    const a = runSequence();
    const b = runSequence();
    expect(a).toEqual(b);
  });
});
