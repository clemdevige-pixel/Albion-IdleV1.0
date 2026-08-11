import { GameProvider } from "./state/GameContext";
import { NavigationProvider } from "./ui/navigation";
import { AppShell } from "./ui/shell";

export function App(): JSX.Element {
  return (
    <GameProvider>
      <NavigationProvider>
        <AppShell />
      </NavigationProvider>
    </GameProvider>
  );
}
