import type { UiModuleDefinition } from "../modules/moduleDefinition";
import type { UiModuleId } from "./moduleIds";
import { UI_MODULE_IDS } from "./moduleIds";

export const UI_MODULE_LABELS: Readonly<Record<UiModuleId, string>> = {
  dashboard: "Tableau de bord",
  character: "Personnage",
  inventory: "Inventaire",
  masteries: "Maîtrises",
  island: "Île",
  merchant: "Marchand",
  world: "Monde",
};

export const PRIMARY_UI_MODULES: readonly UiModuleDefinition[] = [
  { id: UI_MODULE_IDS.character, label: "Personnage", icon: "nav-character.png" },
  { id: UI_MODULE_IDS.inventory, label: "Inventaire", icon: "nav-inventory.png" },
  { id: UI_MODULE_IDS.masteries, label: "Maîtrises", icon: "nav-masteries.png" },
  { id: UI_MODULE_IDS.island, label: "Île", icon: "nav-island.png" },
  { id: UI_MODULE_IDS.merchant, label: "Marchand", icon: "nav-merchant.png" },
  { id: UI_MODULE_IDS.world, label: "Monde", icon: "nav-world.png" },
] as const;
