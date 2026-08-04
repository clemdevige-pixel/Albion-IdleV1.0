import type { CraftingResult, CraftingSessionId } from "./crafting-types.js";

export interface CraftStartedEvent {
  readonly sessionId: CraftingSessionId;
  readonly recipeId: string;
  readonly quantity: number;
}

export interface CraftCompletedEvent {
  readonly sessionId: CraftingSessionId;
  readonly recipeId: string;
  readonly result: CraftingResult;
}

export interface CraftCancelledEvent {
  readonly sessionId: CraftingSessionId;
  readonly recipeId: string;
}

export interface CraftFailedEvent {
  readonly sessionId: CraftingSessionId;
  readonly recipeId: string;
  readonly reason: string;
}

export interface CraftTickEvent {
  readonly sessionId: CraftingSessionId;
  readonly progress: number;
}

export interface CraftingEventMap {
  readonly "craft:started": CraftStartedEvent;
  readonly "craft:completed": CraftCompletedEvent;
  readonly "craft:cancelled": CraftCancelledEvent;
  readonly "craft:failed": CraftFailedEvent;
  readonly "craft:tick": CraftTickEvent;
}
