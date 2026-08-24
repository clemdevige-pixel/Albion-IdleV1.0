export const COMBAT_ACTOR_PRESENTATION_SCALE = 0.80;

export function scaleCombatActorDisplay(
  width: number,
  height: number,
): { readonly width: number; readonly height: number } {
  return {
    width: width * COMBAT_ACTOR_PRESENTATION_SCALE,
    height: height * COMBAT_ACTOR_PRESENTATION_SCALE,
  };
}
