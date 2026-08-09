import { useContext } from "react";
import { NavigationContext, type UiNavigation } from "./NavigationContext";

export function useNavigation(): UiNavigation {
  const navigation = useContext(NavigationContext);
  if (navigation === null) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return navigation;
}
