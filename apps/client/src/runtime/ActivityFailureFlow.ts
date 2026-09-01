export interface ActivityDungeonRewards {
  readonly silver: number;
  readonly artifactFragments: number;
  readonly enchantmentShards: number;
  readonly factionRunes: number;
  readonly artifacts: number;
}

export interface DungeonFailureRecapModel {
  readonly kind: "dungeon";
  readonly id: number;
  readonly dungeonDefinitionId: string;
  readonly faction: string;
  readonly tier: number;
  readonly encounterNumber: number;
  readonly encounterCount: number;
  readonly durationMs: number;
  readonly rewards: ActivityDungeonRewards;
}

export interface TowerFailureRecapModel {
  readonly kind: "tower";
  readonly id: number;
  readonly floor: number;
  readonly tier: number;
  readonly factionId: string;
  readonly highestClearedFloor: number;
  readonly checkpointFloor: number;
}

export type ActivityFailureRecapModel = DungeonFailureRecapModel | TowerFailureRecapModel;

type Listener = () => void;

class ActivityFailureFlow {
  #recap: ActivityFailureRecapModel | null = null;
  #nextId = 1;
  readonly #listeners = new Set<Listener>();

  readonly subscribe = (listener: Listener): (() => void) => {
    this.#listeners.add(listener);
    return () => { this.#listeners.delete(listener); };
  };

  readonly getSnapshot = (): ActivityFailureRecapModel | null => this.#recap;

  showDungeon(input: Omit<DungeonFailureRecapModel, "kind" | "id">): void {
    this.#recap = {
      kind: "dungeon",
      id: this.#nextId,
      ...input,
    };
    this.#nextId += 1;
    this.#notify();
  }

  showTower(input: Omit<TowerFailureRecapModel, "kind" | "id">): void {
    this.#recap = {
      kind: "tower",
      id: this.#nextId,
      ...input,
    };
    this.#nextId += 1;
    this.#notify();
  }

  dismiss(): void {
    if (this.#recap === null) return;
    this.#recap = null;
    this.#notify();
  }

  #notify(): void {
    for (const listener of this.#listeners) listener();
  }
}

export const activityFailureFlow = new ActivityFailureFlow();
