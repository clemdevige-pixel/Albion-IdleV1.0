export const UI_MODULE_IDS = {
  dashboard: "dashboard",
  character: "character",
  inventory: "inventory",
  masteries: "masteries",
  island: "island",
  merchant: "merchant",
  world: "world",
} as const;

export type UiModuleId = (typeof UI_MODULE_IDS)[keyof typeof UI_MODULE_IDS];

export const DEFAULT_UI_MODULE_ID: UiModuleId = UI_MODULE_IDS.dashboard;
