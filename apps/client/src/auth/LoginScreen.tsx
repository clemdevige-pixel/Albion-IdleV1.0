import { useState, type FormEvent } from "react";
import type { AuthProviders, AuthSession } from "@game/shared";
import type { AuthClient } from "./AuthClient";
import "./auth.css";

export function LoginScreen({ mode, providers, startupError, client, onAuthenticated }: {
  readonly mode: "loading" | "ready";
  readonly providers: AuthProviders;
  readonly startupError?: string;
  readonly client?: AuthClient;
  readonly onAuthenticated: (session: AuthSession) => void;
}): JSX.Element {
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (client === undefined) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    setBusy(true); setError(undefined);
    try {
      const session = creating
        ? await client.register({ email, password, displayName: String(form.get("displayName") ?? "") })
        : await client.login({ email, password });
      onAuthenticated(session);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Connexion impossible.");
    } finally { setBusy(false); }
  };

  return (
    <main className="auth-screen">
      <section className="auth-panel" aria-labelledby="auth-title">
        <header className="auth-panel__header">
          <span className="auth-panel__crest" aria-hidden="true">AI</span>
          <div><p>Albion Idle</p><h1 id="auth-title">{creating ? "Créer un compte" : "Connexion"}</h1></div>
        </header>
        {mode === "loading" ? <p className="auth-panel__loading">Restauration de la session…</p> : (
          <>
            <button type="button" className="auth-discord" disabled={!providers.discord.enabled} onClick={() => {
              if (client !== undefined) window.location.assign(client.discordAuthorizationUrl());
            }}>
              <span aria-hidden="true">◈</span> {providers.discord.enabled ? "Continuer avec Discord" : "Discord non configuré"}
            </button>
            <div className="auth-divider"><span>ou</span></div>
            <form className="auth-form" onSubmit={(event) => { void submit(event); }}>
              {creating ? <label>Pseudonyme<input name="displayName" minLength={2} maxLength={24} autoComplete="nickname" required /></label> : null}
              <label>Adresse email<input name="email" type="email" autoComplete="email" required /></label>
              <label>Mot de passe<input name="password" type="password" minLength={8} maxLength={128} autoComplete={creating ? "new-password" : "current-password"} required /></label>
              <button type="submit" className="auth-submit" disabled={busy}>{busy ? "Connexion…" : creating ? "Créer le compte" : "Se connecter"}</button>
            </form>
            <button type="button" className="auth-switch" onClick={() => { setCreating((value) => !value); setError(undefined); }}>
              {creating ? "J'ai déjà un compte" : "Créer un compte avec une adresse email"}
            </button>
            {error === undefined && startupError === undefined ? null : <p className="auth-error" role="alert">{error ?? startupError}</p>}
          </>
        )}
      </section>
    </main>
  );
}
