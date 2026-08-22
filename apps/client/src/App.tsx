import { useCallback, useMemo, useState } from "react";
import type { SaveFormat } from "@game/persistence";
import { CloudSaveClient } from "./runtime/CloudSaveClient";
import {
  DEV_SANDBOX_SAVE_SLOT_ID,
  isDevSandboxMode,
} from "./runtime/devSandbox";
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
  const devSandbox = isDevSandboxMode();
  const [activeSlotId, setActiveSlotId] = useState<PlayerSaveSlotId | null>(
    () => devSandbox ? "player_slot_1" : null,
  );
  const cloudSaveClient = useMemo(() => new CloudSaveClient(token), [token]);
  const uploadLocalSave = useCallback((save: SaveFormat): void => {
    if (devSandbox || activeSlotId === null) return;
    void cloudSaveClient.upload(activeSlotId, save).catch(() => undefined);
  }, [activeSlotId, cloudSaveClient, devSandbox]);
  const slotSession = useMemo(() => activeSlotId === null ? null : ({
    activeSlotId,
    returnToSlotSelection: () => { setActiveSlotId(null); },
  }), [activeSlotId]);
  const persistenceSlotId = devSandbox
    ? DEV_SANDBOX_SAVE_SLOT_ID
    : activeSlotId === null
      ? null
      : getAccountSaveSlotId(account.id, activeSlotId);

  if (activeSlotId === null || slotSession === null || persistenceSlotId === null) {
    return <SaveSlotSelectionScreen accountId={account.id} accountName={account.displayName} authToken={token} onLogout={() => { void logout(); }} onSelectSlot={setActiveSlotId} />;
  }

  return (
    <SaveSlotSessionProvider session={slotSession}>
      <GameProvider
        key={persistenceSlotId}
        saveSlotId={persistenceSlotId}
        {...(devSandbox ? {} : { onLocalSave: uploadLocalSave })}
      >
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
