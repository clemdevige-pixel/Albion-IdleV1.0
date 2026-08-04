import type { EntityId } from "@game/core";

export interface DeathEvent {
  readonly entityId: EntityId;
  readonly killerEntityId: EntityId | null;
  readonly timestamp: number;
}

export interface LootDrop {
  readonly itemId: string;
  readonly quantity: number;
}

export interface LootResult {
  readonly entityId: EntityId;
  readonly drops: readonly LootDrop[];
  readonly guaranteedDrops: readonly LootDrop[];
}

export interface LootTableLike {
  readonly id: string;
  readonly entries: readonly {
    readonly itemId: string;
    readonly weight: number;
    readonly minQuantity: number;
    readonly maxQuantity: number;
  }[];
  readonly guaranteedDrops: readonly string[];
  readonly maxRolls: number;
}
