export const WEAPON_MECHANICS_CONTRACT = {
  execution: {
    mechanicOrder: "authored_order",
  },
  multiHit: {
    damageBudget: "total_evenly_split",
    stopOnTargetDeath: true,
  },
  dot: {
    damageScaling: "snapshot_source_damage_on_first_apply",
    identity: "source_target_effect_id",
    reapply: "refresh_duration_and_ticks_keep_snapshot",
    stacking: "same_effect_does_not_stack",
  },
  status: {
    identity: "source_target_effect_type_effect_id",
    reapply: "refresh_duration_keep_strongest",
    stacking: "same_effect_does_not_stack",
  },
} as const;

export interface WeaponDotIdentity {
  readonly source: unknown;
  readonly target: unknown;
  readonly effectId: string;
}

/** Shared identity rule used by every weapon DoT. */
export function matchesWeaponDotIdentity(
  active: WeaponDotIdentity,
  incoming: WeaponDotIdentity,
): boolean {
  return active.source === incoming.source
    && active.target === incoming.target
    && active.effectId === incoming.effectId;
}

/** Current global multihit contract: a combo stops as soon as its target dies. */
export function canContinueWeaponMultiHit(targetIsAlive: boolean): boolean {
  return !WEAPON_MECHANICS_CONTRACT.multiHit.stopOnTargetDeath || targetIsAlive;
}

/** Current global DoT contract: source damage is frozen until that DoT expires. */
export function snapshotWeaponDotSourceDamage(sourceDamage: number): number {
  return sourceDamage;
}
