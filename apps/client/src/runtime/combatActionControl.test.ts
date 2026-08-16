import { describe, expect, it } from "vitest";
import type { EntityId } from "@game/core";
import { EffectManager } from "@game/gameplay";
import { canUseActiveAbility } from "./combatActionControl.js";

const HERO_ID = 1 as EntityId;
const ENEMY_ID = 2 as EntityId;

function applyControlEffect(
  effectManager: EffectManager,
  effectType: "stun" | "silence",
): void {
  const applied = effectManager.applyEffect(ENEMY_ID, HERO_ID, {
    id: `effect_test_${effectType}`,
    effectType,
    duration: 2,
    strength: 1,
    refreshOnReapply: true,
  }, 1);
  if (!applied.ok) throw new Error(`Failed to apply ${effectType}`);
}

describe("shared active ability control", () => {
  it("allows active abilities without a blocking control effect", () => {
    expect(canUseActiveAbility(new EffectManager(), HERO_ID)).toBe(true);
  });

  it("blocks active abilities while stunned", () => {
    const effects = new EffectManager();
    applyControlEffect(effects, "stun");
    expect(canUseActiveAbility(effects, HERO_ID)).toBe(false);
  });

  it("blocks active abilities while silenced", () => {
    const effects = new EffectManager();
    applyControlEffect(effects, "silence");
    expect(canUseActiveAbility(effects, HERO_ID)).toBe(false);
  });

  it("allows active abilities again after the control effect expires", () => {
    const effects = new EffectManager();
    applyControlEffect(effects, "stun");
    effects.tickEffects(2);
    expect(canUseActiveAbility(effects, HERO_ID)).toBe(true);
  });
});
