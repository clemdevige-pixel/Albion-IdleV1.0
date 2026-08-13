import { useMemo, useState } from "react";
import type { PlayerSaveSlotId } from "./runtime/saveSlots";
import { GameProvider } from "./state/GameContext";
import { SaveSlotSessionProvider } from "./state/SaveSlotSessionContext";
import { NavigationProvider } from "./ui/navigation";
import { SaveSlotSelectionScreen } from "./ui/save-slots";
import { AppShell } from "./ui/shell";

export function App(): JSX.Element {
  const [activeSlotId, setActiveSlotId] = useState<PlayerSaveSlotId | null>(null);
  const slotSession = useMemo(() => activeSlotId === null ? null : ({
    activeSlotId,
    returnToSlotSelection: () => { setActiveSlotId(null); },
  }), [activeSlotId]);

  if (activeSlotId === null || slotSession === null) {
    return <SaveSlotSelectionScreen onSelectSlot={setActiveSlotId} />;
  }

  return (
    <SaveSlotSessionProvider session={slotSession}>
      <GameProvider key={activeSlotId} saveSlotId={activeSlotId}>
        <NavigationProvider>
          <AppShell />
        </NavigationProvider>
      </GameProvider>
    </SaveSlotSessionProvider>
  );
}
