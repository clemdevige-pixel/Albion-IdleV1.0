import { createContext, useCallback, useMemo, useReducer, type ReactNode } from "react";
import type { UiModuleId } from "./moduleIds";
import { INITIAL_UI_NAVIGATION_STATE, uiNavigationReducer } from "./navigationState";

export interface UiNavigation {
  readonly activeModule: UiModuleId;
  readonly openModule: (moduleId: UiModuleId) => void;
  readonly toggleModule: (moduleId: UiModuleId) => void;
  readonly returnToDashboard: () => void;
}

export const NavigationContext = createContext<UiNavigation | null>(null);

export function NavigationProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(uiNavigationReducer, INITIAL_UI_NAVIGATION_STATE);

  const openModule = useCallback((moduleId: UiModuleId) => {
    dispatch({ type: "open", moduleId });
  }, []);

  const toggleModule = useCallback((moduleId: UiModuleId) => {
    dispatch({ type: "toggle", moduleId });
  }, []);

  const returnToDashboard = useCallback(() => {
    dispatch({ type: "dashboard" });
  }, []);

  const value = useMemo<UiNavigation>(
    () => ({
      activeModule: state.activeModule,
      openModule,
      toggleModule,
      returnToDashboard,
    }),
    [state.activeModule, openModule, toggleModule, returnToDashboard],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}
