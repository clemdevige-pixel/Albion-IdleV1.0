import type { ActiveStatusEffect } from "./types.js";

export interface EffectEventMap {
  StatusApplied: { readonly effect: ActiveStatusEffect };
  StatusRefreshed: { readonly effect: ActiveStatusEffect; readonly previousDuration: number };
  StatusExpired: { readonly effect: ActiveStatusEffect };
  StatusRemoved: { readonly effect: ActiveStatusEffect };
}
