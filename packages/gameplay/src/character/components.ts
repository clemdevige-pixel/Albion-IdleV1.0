import { defineComponent } from "@game/core";
import type { CharacterId, CharacterProfile, CharacterStatus } from "./types.js";

export const IdentityComponent = defineComponent<{
  characterId: CharacterId;
  name: string;
}>("character_identity");

export const ProfileComponent = defineComponent<CharacterProfile>("character_profile");

export const StateComponent = defineComponent<CharacterStatus>("character_state");

export const PositionComponent = defineComponent<{
  x: number;
  y: number;
}>("character_position");

export type Direction = "north" | "south" | "east" | "west";

export const DirectionComponent = defineComponent<{
  direction: Direction;
}>("character_direction");
