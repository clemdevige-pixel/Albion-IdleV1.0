import { EventBus } from "@game/core";
import type { RecipeId } from "../recipes/recipe-types.js";
import type { RefiningEventMap } from "./refining-events.js";
import type {
  RefiningRequest,
  RefiningSessionConfig,
  RefiningSessionId,
} from "./refining-types.js";
import { asRefiningSessionId } from "./refining-types.js";
import { RefiningSession } from "./refining-session.js";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type RefiningStartResult =
  | { readonly ok: true; readonly sessionId: RefiningSessionId }
  | { readonly ok: false; readonly reason: string };

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

let sessionCounter = 0;

/** @internal — for test cleanup only */
export function _resetRefiningSessionCounter(): void {
  sessionCounter = 0;
}

export class RefiningManager {
  readonly events = new EventBus<RefiningEventMap>();

  #activeSession: RefiningSession | undefined;

  startRefining(
    request: RefiningRequest,
    config: RefiningSessionConfig,
    currentTick: number,
  ): RefiningStartResult {
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
    const sessionId = asRefiningSessionId(`refine-${sessionCounter}`);

    const session = new RefiningSession(
      sessionId,
      request.recipeId,
      request.quantity,
      config,
      currentTick,
    );

    session.start();

    this.#activeSession = session;

    this.events.publish("refine:started", {
      sessionId,
      recipeId: request.recipeId,
      quantity: request.quantity,
    });

    return { ok: true, sessionId };
  }

  tick(currentTick: number): void {
    const session = this.#activeSession;
    if (session === undefined || session.state !== "refining") return;

    session.tick(currentTick);

    if ((session.state as string) === "completed") {
      this.#completeSession(session);
    }
  }

  cancelSession(sessionId: RefiningSessionId): boolean {
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

    this.events.publish("refine:cancelled", {
      sessionId: session.id,
      recipeId: session.recipeId as RecipeId,
    });

    return true;
  }

  getActiveSession(): RefiningSession | undefined {
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

  clear(): void {
    this.#activeSession = undefined;
  }

  #completeSession(session: RefiningSession): void {
    const outputQuantity = Math.max(1, session.quantity);

    this.events.publish("refine:completed", {
      sessionId: session.id,
      recipeId: session.recipeId as RecipeId,
      result: {
        ok: true,
        recipeId: session.recipeId as RecipeId,
        outputQuantity,
      },
    });
  }
}
