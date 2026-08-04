import { EventBus } from "@game/core";
import type { CraftingEventMap } from "./crafting-events.js";
import type {
  CraftingRequest,
  CraftingResult,
  CraftingSessionConfig,
  CraftingSessionId,
} from "./crafting-types.js";
import { asCraftingSessionId } from "./crafting-types.js";
import { CraftingSession } from "./crafting-session.js";
import { resolveCraftResult } from "./crafting-resolver.js";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type CraftingStartResult =
  | { readonly ok: true; readonly sessionId: CraftingSessionId }
  | { readonly ok: false; readonly reason: string };

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

let sessionCounter = 0;

/** @internal — for test cleanup only */
export function _resetCraftingSessionCounter(): void {
  sessionCounter = 0;
}

export class CraftingManager {
  readonly events = new EventBus<CraftingEventMap>();

  #activeSession: CraftingSession | undefined;
  #lastResult: CraftingResult | undefined;

  startCrafting(
    request: CraftingRequest,
    config: CraftingSessionConfig,
    currentTick: number,
  ): CraftingStartResult {
    // Only one active session at a time
    if (
      this.#activeSession !== undefined &&
      this.#activeSession.state !== "completed" &&
      this.#activeSession.state !== "cancelled" &&
      this.#activeSession.state !== "failed"
    ) {
      return { ok: false, reason: "session_already_active" };
    }

    if (request.quantity < 1) {
      return { ok: false, reason: "invalid_quantity" };
    }

    sessionCounter += 1;
    const sessionId = asCraftingSessionId(`craft-${sessionCounter}`);

    const session = new CraftingSession(
      sessionId,
      request.recipeId,
      request.quantity,
      config,
      currentTick,
    );

    // Run through validation (extension point for Phase 14.2/14.3)
    session.validate();
    session.start();

    this.#activeSession = session;

    this.events.publish("craft:started", {
      sessionId,
      recipeId: request.recipeId,
      quantity: request.quantity,
    });

    return { ok: true, sessionId };
  }

  tick(currentTick: number): void {
    const session = this.#activeSession;
    if (session === undefined || session.state !== "crafting") return;

    session.tick(currentTick);

    this.events.publish("craft:tick", {
      sessionId: session.id,
      progress: session.getProgress(currentTick),
    });

    if ((session.state as string) === "completing") {
      this.#completeSession(session);
    }
  }

  cancelSession(sessionId: CraftingSessionId): boolean {
    const session = this.#activeSession;
    if (
      session === undefined ||
      session.id !== sessionId ||
      session.state === "completed" ||
      session.state === "cancelled" ||
      session.state === "failed"
    ) {
      return false;
    }

    session.cancel();

    this.events.publish("craft:cancelled", {
      sessionId: session.id,
      recipeId: session.recipeId,
    });

    return true;
  }

  getActiveSession(): CraftingSession | undefined {
    const session = this.#activeSession;
    if (
      session !== undefined &&
      session.state !== "completed" &&
      session.state !== "cancelled" &&
      session.state !== "failed"
    ) {
      return session;
    }
    return undefined;
  }

  getLastResult(): CraftingResult | undefined {
    return this.#lastResult;
  }

  clear(): void {
    this.#activeSession = undefined;
    this.#lastResult = undefined;
  }

  #completeSession(session: CraftingSession): void {
    const request: CraftingRequest = {
      recipeId: session.recipeId,
      quantity: session.quantity,
    };

    const result = resolveCraftResult(session.config, request);

    session.complete();
    this.#lastResult = result;

    this.events.publish("craft:completed", {
      sessionId: session.id,
      recipeId: session.recipeId,
      result,
    });
  }
}
