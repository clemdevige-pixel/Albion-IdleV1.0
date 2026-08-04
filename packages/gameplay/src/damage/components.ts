import { defineComponent } from "@game/core";

export interface HealthData {
  currentHealth: number;
  maxHealth: number;
}

export const HealthComponent = defineComponent<HealthData>("health");
