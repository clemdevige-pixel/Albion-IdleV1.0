import { useCallback, useMemo, useState } from "react";
import type { SaveFormat } from "@game/persistence";
import { CloudSaveClient } from "./runtime/CloudSaveClient";
import { getAccountSaveSlotId, type PlayerSaveSlotId } from "./runtime/saveSlots";
import { GameProvider } from "./state/GameContext";
import { SaveSlotSessionProvider } from "./state/SaveSlotSessionContext";
import { NavigationProvider } from "./ui/navigation";
import { SaveSlotSelectionScreen } from "./ui/save-slots";
import { AppShell } from "./ui/shell";
import { AuthGate } from "./auth/AuthGate";
import { useAuthSession } from "./auth/AuthSessionContext";

function AuthenticatedApp(): JSX.Element {
  const { account, token, logout } = useAuthSession();
  const [activeSlotId, setActiveSlotId] = useState<PlayerSaveSlotId | null>(null);
  const cloudSaveClient = useMemo(() => new CloudSaveClient(token), [token]);
  const uploadLocalSave = useCallback((save: SaveFormat): void => {
    if (activeSlotId !== null) void cloudSaveClient.upload(activeSlotId, save).catch(() => undefined);
  }, [activeSlotId, cloudSaveClient]);
  const slotSession = useMemo(() => activeSlotId === null ? null : ({
    activeSlotId,
    returnToSlotSelection: () => { setActiveSlotId(null); },
  }), [activeSlotId]);
  const persistenceSlotId = activeSlotId === null
    ? null
    : getAccountSaveSlotId(account.id, activeSlotId);

  if (activeSlotId === null || slotSession === null || persistenceSlotId === null) {
    return <SaveSlotSelectionScreen accountId={account.id} accountName={account.displayName} authToken={token} onLogout={() => { void logout(); }} onSelectSlot={setActiveSlotId} />;
  }

  return (
    <SaveSlotSessionProvider session={slotSession}>
      <GameProvider key={persistenceSlotId} saveSlotId={persistenceSlotId} onLocalSave={uploadLocalSave}>
        <NavigationProvider>
          <AppShell />
        </NavigationProvider>
      </GameProvider>
    </SaveSlotSessionProvider>
  );
}

export function App(): JSX.Element {
  return <AuthGate><AuthenticatedApp /></AuthGate>;
}
