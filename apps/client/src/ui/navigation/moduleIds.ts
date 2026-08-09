export const UI_MODULE_IDS = {
  dashboard: "dashboard",
  bank: "bank",
  character: "character",
  inventory: "inventory",
  masteries: "masteries",
  production: "production",
  craft: "craft",
  merchant: "merchant",
  world: "world",
  equipment: "equipment",
  stats: "stats",
  wallet: "wallet",
  repair: "repair",
} as const;

export type UiModuleId = (typeof UI_MODULE_IDS)[keyof typeof UI_MODULE_IDS];

export const DEFAULT_UI_MODULE_ID: UiModuleId = UI_MODULE_IDS.dashboard;
