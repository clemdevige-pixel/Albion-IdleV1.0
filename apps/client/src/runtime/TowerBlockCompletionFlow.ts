import { combatStopController } from "./CombatStopController.js";
import { worldTravelTransition } from "./WorldTravelTransition.js";

export interface TowerBlockCompletionRecapModel {
  readonly id: number;
  readonly blockIndex: number;
  readonly floorStart: number;
  readonly floorEnd: number;
  readonly tier: number;
  readonly factionId: string;
  readonly finalFloorSilver: number;
  readonly repeatableBlockChestSilver: number;
  readonly firstClearBlockBonusSilver: number;
  readonly majorBossFirstClearBonusSilver: number;
  readonly checkpointFloor: number;
  readonly nextFloor: number;
  readonly nextTier: number;
  readonly nextFactionId: string;
  readonly endlessUnlocked: boolean;
  readonly unlockedEndlessNow: boolean;
}

type Listener = () => void;

class TowerBlockCompletionFlow {
  #recap: TowerBlockCompletionRecapModel | null = null;
  #nextId = 1;
  readonly #listeners = new Set<Listener>();

  readonly subscribe = (listener: Listener): (() => void) => {
    this.#listeners.add(listener);
    return () => { this.#listeners.delete(listener); };
  };

  readonly getSnapshot = (): TowerBlockCompletionRecapModel | null => this.#recap;

  show(input: Omit<TowerBlockCompletionRecapModel, "id">): void {
    this.#recap = { id: this.#nextId, ...input };
    this.#nextId += 1;
    this.#notify();
  }

  dismiss(): void {
    if (this.#recap === null) return;
    this.#recap = null;
    this.#notify();
  }

  resumeWorldExploration(): boolean {
    if (this.#recap === null || !combatStopController.resume()) return false;
    this.#recap = null;
    worldTravelTransition.start();
    this.#notify();
    return true;
  }

  #notify(): void {
    for (const listener of this.#listeners) listener();
  }
}

export const towerBlockCompletionFlow = new TowerBlockCompletionFlow();
