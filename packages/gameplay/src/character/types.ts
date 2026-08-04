import type { Brand } from "@game/core";

export type CharacterId = Brand<string, "CharacterId">;

export type CharacterState = "idle" | "moving" | "busy" | "dead";

export interface CharacterProfile {
  readonly id: CharacterId;
  readonly name: string;
  readonly createdAtTick: number;
}

export interface CharacterStatus {
  state: CharacterState;
}
