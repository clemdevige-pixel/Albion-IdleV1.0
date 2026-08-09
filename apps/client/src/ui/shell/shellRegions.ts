export const UI_SHELL_REGIONS = {
  header: "header",
  world: "world",
  rightPanel: "right-panel",
  bottomBar: "bottom-bar",
} as const;

export type UiShellRegion = (typeof UI_SHELL_REGIONS)[keyof typeof UI_SHELL_REGIONS];
