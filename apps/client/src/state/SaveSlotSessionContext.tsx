import { createContext, useContext, type ReactNode } from "react";
import type { PlayerSaveSlotId } from "../runtime/saveSlots";

export interface SaveSlotSession {
  readonly activeSlotId: PlayerSaveSlotId;
  readonly returnToSlotSelection: () => void;
}

const SaveSlotSessionContext = createContext<SaveSlotSession | undefined>(undefined);

export function SaveSlotSessionProvider({
  session,
  children,
}: {
  readonly session: SaveSlotSession;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <SaveSlotSessionContext.Provider value={session}>
      {children}
    </SaveSlotSessionContext.Provider>
  );
}

export function useSaveSlotSession(): SaveSlotSession {
  const session = useContext(SaveSlotSessionContext);
  if (session === undefined) {
    throw new Error("useSaveSlotSession must be used inside SaveSlotSessionProvider");
  }
  return session;
}
