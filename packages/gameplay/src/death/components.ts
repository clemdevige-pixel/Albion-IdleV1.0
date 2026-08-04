import { defineComponent } from "@game/core";
import type { EntityId } from "@game/core";

export interface DeathData {
  isDead: boolean;
  processed: boolean;
  killerEntityId: EntityId | null;
  deathTick: number;
}

export const DeathComponent = defineComponent<DeathData>("death");
