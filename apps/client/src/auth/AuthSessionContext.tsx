import { createContext, useContext, type ReactNode } from "react";
import type { Account } from "@game/shared";

export interface ClientAuthSession {
  readonly account: Account;
  readonly token: string;
  readonly logout: () => Promise<void>;
}

const AuthSessionContext = createContext<ClientAuthSession | undefined>(undefined);

export function AuthSessionProvider({ session, children }: {
  readonly session: ClientAuthSession;
  readonly children: ReactNode;
}): JSX.Element {
  return <AuthSessionContext.Provider value={session}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): ClientAuthSession {
  const session = useContext(AuthSessionContext);
  if (session === undefined) throw new Error("useAuthSession must be used inside AuthSessionProvider");
  return session;
}
