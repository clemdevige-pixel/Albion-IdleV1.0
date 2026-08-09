import type { UiModuleDefinition } from "../modules/moduleDefinition";
import type { UiModuleId } from "./moduleIds";
import { UI_MODULE_IDS } from "./moduleIds";

export const UI_MODULE_LABELS: Readonly<Record<UiModuleId, string>> = {
  dashboard: "Tableau de bord",
  bank: "Banque",
  character: "Personnage",
  inventory: "Inventaire",
  masteries: "Maîtrises",
  production: "Production",
  craft: "Fabrication",
  merchant: "Marchand",
  world: "Monde",
  equipment: "Équipement",
  stats: "Caractéristiques",
  wallet: "Portefeuille",
  repair: "Réparation",
};

export const PRIMARY_UI_MODULES: readonly UiModuleDefinition[] = [
  { id: UI_MODULE_IDS.inventory, label: "Inventaire", icon: "nav-inventory.png" },
  { id: UI_MODULE_IDS.bank, label: "Banque", icon: "nav-inventory.png" },
  { id: UI_MODULE_IDS.character, label: "Personnage", icon: "nav-character.png" },
  { id: UI_MODULE_IDS.masteries, label: "Maîtrises", icon: "nav-masteries.png" },
  { id: UI_MODULE_IDS.merchant, label: "Marchand", icon: "nav-vendor.png" },
  { id: UI_MODULE_IDS.production, label: "Production", icon: "nav-production.png" },
] as const;
