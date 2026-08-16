import { afterEach, describe, expect, it } from "vitest";
import {
  applyPresentedEnemyImpact,
  clearPresentedEnemyHealth,
  getPresentedEnemyHealth,
  isPresentedEnemyDefeated,
  resetPresentedEnemyHealth,
} from "./CombatPresentedHealth";

afterEach(() => {
  clearPresentedEnemyHealth();
});

describe("presented enemy health lifecycle", () => {
  it("keeps authoritative future-enemy health from replacing the current presented enemy before impact", () => {
    resetPresentedEnemyHealth(100, 100);

    expect(getPresentedEnemyHealth(250, 250)).toEqual({ current: 100, maximum: 100 });

    applyPresentedEnemyImpact(0);
    expect(getPresentedEnemyHealth(250, 250)).toEqual({ current: 0, maximum: 100 });
    expect(isPresentedEnemyDefeated()).toBe(true);
  });

  it("never moves presented health backwards when delayed impacts arrive out of order", () => {
    resetPresentedEnemyHealth(100, 100);
    applyPresentedEnemyImpact(40);
    applyPresentedEnemyImpact(70);

    expect(getPresentedEnemyHealth(100, 100)).toEqual({ current: 40, maximum: 100 });
  });
});
