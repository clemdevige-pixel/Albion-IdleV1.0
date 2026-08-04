export interface RangedCombatPresentationProfile {
  readonly id: string;
  readonly projectileId: string;
  readonly releaseDelayMs: number;
}

export const RANGED_COMBAT_PRESENTATION_PROFILES:
  readonly RangedCombatPresentationProfile[] = [
    {
      id: "badon",
      projectileId: "badon_arrow",
      releaseDelayMs: 355,
    },
    {
      id: "bow",
      projectileId: "arrow",
      releaseDelayMs: 355,
    },
    {
      id: "fire_staff",
      projectileId: "fireball",
      releaseDelayMs: 355,
    },
  ];

export function resolveRangedCombatPresentation(
  profileId: string | undefined,
): RangedCombatPresentationProfile | undefined {
  return RANGED_COMBAT_PRESENTATION_PROFILES.find(
    (profile) => profile.id === profileId,
  );
}
