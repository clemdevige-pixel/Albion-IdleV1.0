import type { EntityId } from "@game/core";
import type {
  CombatSessionData,
  CombatSessionId,
  CombatState,
  EncounterId,
} from "./types.js";

/**
 * Encapsulates the mutable runtime data of a single combat encounter.
 * Pure data holder — no dependency on World or managers.
 */
export class CombatSession {
  #state: CombatState;
  #elapsedTime: number;

  private constructor(
    readonly sessionId: CombatSessionId,
    readonly encounterId: EncounterId,
    readonly hero: EntityId,
    readonly enemies: readonly EntityId[],
    initialState: CombatState,
  ) {
    this.#state = initialState;
    this.#elapsedTime = 0;
  }

  // -- Factory --------------------------------------------------------------

  static create(
    sessionId: CombatSessionId,
    encounterId: EncounterId,
    hero: EntityId,
    enemies: readonly EntityId[],
  ): CombatSession {
    return new CombatSession(sessionId, encounterId, hero, enemies, "combat");
  }

  // -- Accessors -------------------------------------------------------------

  getState(): CombatState {
    return this.#state;
  }

  setState(state: CombatState): void {
    this.#state = state;
  }

  getElapsedTime(): number {
    return this.#elapsedTime;
  }

  getParticipants(): { readonly hero: EntityId; readonly enemies: readonly EntityId[] } {
    return { hero: this.hero, enemies: this.enemies };
  }

  // -- Tick ------------------------------------------------------------------

  tick(deltaTime: number): void {
    this.#elapsedTime += deltaTime;
  }

  // -- Snapshot --------------------------------------------------------------

  toData(): CombatSessionData {
    return {
      sessionId: this.sessionId,
      encounterId: this.encounterId,
      state: this.#state,
      participants: { hero: this.hero, enemies: this.enemies },
      elapsedTime: this.#elapsedTime,
    };
  }
}
