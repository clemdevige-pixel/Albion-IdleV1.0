import { describe, expect, it } from "vitest";
import { UI_MODULE_IDS } from "./moduleIds";
import { INITIAL_UI_NAVIGATION_STATE, uiNavigationReducer } from "./navigationState";

describe("uiNavigationReducer", () => {
  it("starts on the dashboard", () => {
    expect(INITIAL_UI_NAVIGATION_STATE.activeModule).toBe(UI_MODULE_IDS.dashboard);
  });

  it("keeps only the last opened module active", () => {
    const character = uiNavigationReducer(INITIAL_UI_NAVIGATION_STATE, {
      type: "open",
      moduleId: UI_MODULE_IDS.character,
    });
    const merchant = uiNavigationReducer(character, {
      type: "open",
      moduleId: UI_MODULE_IDS.merchant,
    });

    expect(merchant.activeModule).toBe(UI_MODULE_IDS.merchant);
  });

  it("returns to the dashboard when the active module is toggled", () => {
    const character = uiNavigationReducer(INITIAL_UI_NAVIGATION_STATE, {
      type: "toggle",
      moduleId: UI_MODULE_IDS.character,
    });
    const dashboard = uiNavigationReducer(character, {
      type: "toggle",
      moduleId: UI_MODULE_IDS.character,
    });

    expect(dashboard.activeModule).toBe(UI_MODULE_IDS.dashboard);
  });
});
