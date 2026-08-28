import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Account, AuthProviders } from "@game/shared";
import { AuthClient } from "./AuthClient";
import { AuthSessionProvider } from "./AuthSessionContext";
import { LoginScreen } from "./LoginScreen";

const TOKEN_STORAGE_KEY = "albion_idle_auth_token_v1";
interface ActiveAuth { readonly account: Account; readonly token: string; }

function persistAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (error) {
    // Authentication for the current session remains valid even if browser
    // storage is full/unavailable. Do not turn a persistence quota issue into
    // a login failure; the user may need to authenticate again after reload.
    console.error("[Auth] Failed to persist authentication token:", error);
  }
}

function clearPersistedAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error("[Auth] Failed to clear persisted authentication token:", error);
  }
}

// React StrictMode intentionally mounts effects twice in development. Keep the
// one-time Discord exchange shared between both passes so the OAuth return code
// is never consumed by an effect that has already been cancelled.
let pendingDiscordExchange: Promise<ActiveAuth> | undefined;

function discordExchangeFromCurrentUrl(client: AuthClient): Promise<ActiveAuth> | undefined {
  if (pendingDiscordExchange !== undefined) return pendingDiscordExchange;

  const url = new URL(window.location.href);
  const discordCode = url.searchParams.get("discord_auth_code");
  if (discordCode === null) return undefined;

  url.searchParams.delete("discord_auth_code");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  pendingDiscordExchange = client.exchangeDiscordCode(discordCode);
  return pendingDiscordExchange;
}

export function AuthGate({ children }: { readonly children: ReactNode }): JSX.Element {
  const client = useMemo(() => new AuthClient(), []);
  const [active, setActive] = useState<ActiveAuth | null>(null);
  const [providers, setProviders] = useState<AuthProviders>({ discord: { enabled: false } });
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    const discordExchange = discordExchangeFromCurrentUrl(client);
    const initialize = async (): Promise<void> => {
      try {
        const available = await client.providers();
        if (!cancelled) setProviders(available);
        if (discordExchange !== undefined) {
          const session = await discordExchange;
          persistAuthToken(session.token);
          if (!cancelled) setActive(session);
          return;
        }
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (token !== null) {
          try {
            const account = await client.restore(token);
            if (!cancelled) setActive({ account, token });
          } catch { clearPersistedAuthToken(); }
        }
      } catch (error) {
        if (!cancelled) setStartupError(error instanceof Error ? error.message : "Connexion au serveur impossible.");
      } finally { if (!cancelled) setLoading(false); }
    };
    void initialize();
    return () => { cancelled = true; };
  }, [client]);

  if (loading) return <LoginScreen mode="loading" providers={providers} onAuthenticated={setActive} />;
  if (active === null) {
    return <LoginScreen mode="ready" providers={providers} {...(startupError === undefined ? {} : { startupError })} client={client} onAuthenticated={(session) => {
      persistAuthToken(session.token);
      setActive(session);
    }} />;
  }

  return (
    <AuthSessionProvider session={{ account: active.account, token: active.token, logout: async () => {
      try { await client.logout(active.token); } finally {
        clearPersistedAuthToken();
        setActive(null);
      }
    } }}>
      {children}
    </AuthSessionProvider>
  );
}
