import type { Brand } from "@game/core";

export type StatId = Brand<string, "StatId">;
export type ModifierId = Brand<string, "ModifierId">;

export type ModifierType = "flat" | "percent" | "multiplier";

export interface StatDefinition {
  readonly id: StatId;
  readonly min: number;
  readonly max: number;
  readonly defaultBase: number;
}

export interface StatValue {
  base: number;
  computed: number;
}

export interface StatModifier {
  readonly id: ModifierId;
  readonly statId: StatId;
  readonly type: ModifierType;
  readonly value: number;
  readonly priority: number;
  readonly source: string;
}
