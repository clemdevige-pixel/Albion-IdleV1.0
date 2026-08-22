export interface BackgroundProgressionFoundationDependencies {
  readonly getTrustedElapsedMs: () => number;
  readonly advancePassiveFactionProgression: (elapsedMs: number) => void;
  readonly saveResolvedState: () => void;
}

export interface BackgroundProgressionResolution {
  readonly elapsedMs: number;
  readonly resolved: boolean;
}

/**
 * Resolves passive systems from server-authoritative elapsed time after load.
 * It owns no gameplay rules and never falls back to client time.
 */
export function createBackgroundProgressionFoundation(
  dependencies: BackgroundProgressionFoundationDependencies,
) {
  return {
    resolveAfterLoad(this: void): BackgroundProgressionResolution {
      const elapsedMs = dependencies.getTrustedElapsedMs();
      if (elapsedMs <= 0) {
        return { elapsedMs: 0, resolved: false };
      }

      dependencies.advancePassiveFactionProgression(elapsedMs);
      dependencies.saveResolvedState();
      return { elapsedMs, resolved: true };
    },
  };
}

export type BackgroundProgressionFoundation = ReturnType<
  typeof createBackgroundProgressionFoundation
>;
