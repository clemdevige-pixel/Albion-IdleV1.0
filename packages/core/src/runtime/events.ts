/**
 * Generic, gameplay-free runtime events. These describe the simulation
 * lifecycle only — no Albion-specific meaning.
 */
export interface RuntimeEventMap {
  SimulationStarted: { readonly tick: number };
  SimulationStopped: { readonly tick: number };
  SimulationPaused: { readonly tick: number };
  SimulationResumed: { readonly tick: number };
  TickAdvanced: { readonly tick: number; readonly deltaTime: number };
}

export type RuntimeEventName = keyof RuntimeEventMap;
