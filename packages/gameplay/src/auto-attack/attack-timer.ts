import type { AutoAttackData } from "./types.js";

const MIN_ATTACK_SPEED = 0.001;

export function computeAttackInterval(attackSpeed: number): number {
  return 1 / Math.max(attackSpeed, MIN_ATTACK_SPEED);
}

export function tickAttackTimer(
  data: AutoAttackData,
  deltaTime: number,
): boolean {
  if (data.attackReady) return false;

  data.timer += deltaTime;

  if (data.timer >= data.interval) {
    data.attackReady = true;
    // Do not carry simulation overshoot into the following attack. With a
    // coarse fixed tick, retained overshoot periodically creates an almost
    // immediate second strike instead of a stable weapon cadence.
    data.timer = 0;
    return true;
  }

  return false;
}
