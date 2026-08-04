export interface VisualProfileParameters {
  readonly approachDistance: number;
  readonly motionDurationMs: number;
  readonly impactDelayMs: number;
}

export interface VisualProfile {
  readonly id: string;
  readonly mode:
    | "melee"
    | "projectile"
    | "projectile_aoe"
    | "beam"
    | "channel"
    | "dash"
    | "summon"
    | "ground_effect";
  readonly defaults: VisualProfileParameters;
}

export class VisualProfileRegistry {
  readonly #profiles = new Map<string, VisualProfile>();

  register(profile: VisualProfile): void {
    if (this.#profiles.has(profile.id)) {
      throw new Error(`Visual Profile dupliqué : ${profile.id}`);
    }
    this.#profiles.set(profile.id, profile);
  }

  resolve(
    id: string,
    overrides: Partial<VisualProfileParameters>,
  ): VisualProfileParameters {
    const profile = this.#profiles.get(id);
    if (profile === undefined) {
      throw new Error(`Visual Profile introuvable : ${id}`);
    }
    return {
      ...profile.defaults,
      ...overrides,
    };
  }
}

export const visualProfileRegistry = new VisualProfileRegistry();

visualProfileRegistry.register({
  id: "melee",
  mode: "melee",
  defaults: {
    approachDistance: 48,
    motionDurationMs: 90,
    impactDelayMs: 75,
  },
});

visualProfileRegistry.register({
  id: "projectile",
  mode: "projectile",
  defaults: {
    approachDistance: 0,
    motionDurationMs: 0,
    impactDelayMs: 355,
  },
});
