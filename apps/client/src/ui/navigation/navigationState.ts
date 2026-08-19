import { DEFAULT_UI_MODULE_ID, type UiModuleId } from "./moduleIds";

export interface UiNavigationState {
  readonly activeModule: UiModuleId;
  readonly activeView: string | null;
}

export type UiNavigationAction =
  | { readonly type: "open"; readonly moduleId: UiModuleId; readonly view?: string }
  | { readonly type: "toggle"; readonly moduleId: UiModuleId }
  | { readonly type: "dashboard" };

export const INITIAL_UI_NAVIGATION_STATE: UiNavigationState = {
  activeModule: DEFAULT_UI_MODULE_ID,
  activeView: null,
};

export function uiNavigationReducer(
  state: UiNavigationState,
  action: UiNavigationAction,
): UiNavigationState {
  if (action.type === "dashboard") {
    return state.activeModule === DEFAULT_UI_MODULE_ID && state.activeView === null
      ? state
      : { activeModule: DEFAULT_UI_MODULE_ID, activeView: null };
  }

  if (action.type === "toggle" && state.activeModule === action.moduleId) {
    return { activeModule: DEFAULT_UI_MODULE_ID, activeView: null };
  }

  if (action.type === "toggle") {
    return { activeModule: action.moduleId, activeView: null };
  }

  const activeView = action.view ?? null;
  if (state.activeModule === action.moduleId && state.activeView === activeView) {
    return state;
  }

  return { activeModule: action.moduleId, activeView };
}
