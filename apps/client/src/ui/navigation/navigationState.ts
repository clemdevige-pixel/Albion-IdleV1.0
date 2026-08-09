import { DEFAULT_UI_MODULE_ID, type UiModuleId } from "./moduleIds";

export interface UiNavigationState {
  readonly activeModule: UiModuleId;
}

export type UiNavigationAction =
  | { readonly type: "open"; readonly moduleId: UiModuleId }
  | { readonly type: "toggle"; readonly moduleId: UiModuleId }
  | { readonly type: "dashboard" };

export const INITIAL_UI_NAVIGATION_STATE: UiNavigationState = {
  activeModule: DEFAULT_UI_MODULE_ID,
};

export function uiNavigationReducer(
  state: UiNavigationState,
  action: UiNavigationAction,
): UiNavigationState {
  if (action.type === "dashboard") {
    return state.activeModule === DEFAULT_UI_MODULE_ID
      ? state
      : { activeModule: DEFAULT_UI_MODULE_ID };
  }

  if (action.type === "toggle" && state.activeModule === action.moduleId) {
    return { activeModule: DEFAULT_UI_MODULE_ID };
  }

  if (state.activeModule === action.moduleId) {
    return state;
  }

  return { activeModule: action.moduleId };
}
