import { randomBytes } from "node:crypto";
import type { AuthSession } from "@game/shared";
import type { DiscordIdentity } from "./AuthService.js";

export interface DiscordOAuthConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
}

export interface DiscordOAuthClient {
  exchangeCode(code: string): Promise<DiscordIdentity>;
}

export interface DiscordOAuthFlowRepository {
  issueState(now?: number): Promise<string>;
  consumeState(state: string, now?: number): Promise<boolean>;
  issueStateForOrigin(returnOrigin: string, now?: number): Promise<string>;
  consumeStateWithOrigin(state: string, now?: number): Promise<string | undefined>;
  issueExchange(session: AuthSession, now?: number): Promise<string>;
  consumeExchange(code: string, now?: number): Promise<AuthSession | undefined>;
}

export class DiscordHttpOAuthClient implements DiscordOAuthClient {
  public constructor(private readonly config: DiscordOAuthConfig) {}

  public async exchangeCode(code: string): Promise<DiscordIdentity> {
    const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });
    if (!tokenResponse.ok) throw new Error("Discord token exchange failed");
    const tokenPayload = await tokenResponse.json() as { access_token?: unknown };
    if (typeof tokenPayload.access_token !== "string") throw new Error("Discord token missing");

    const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { authorization: `Bearer ${tokenPayload.access_token}` },
    });
    if (!userResponse.ok) throw new Error("Discord profile request failed");
    const user = await userResponse.json() as Record<string, unknown>;
    if (typeof user.id !== "string" || typeof user.username !== "string") {
      throw new Error("Discord profile invalid");
    }
    return {
      id: user.id,
      username: user.username,
      globalName: typeof user.global_name === "string" ? user.global_name : null,
      email: typeof user.email === "string" ? user.email : null,
      emailVerified: user.verified === true,
    };
  }
}

interface ExpiringValue<T> { readonly value: T; readonly expiresAt: number; }

/** Short-lived OAuth state and one-time browser exchange codes. */
export class DiscordOAuthFlowStore implements DiscordOAuthFlowRepository {
  private readonly states = new Map<string, ExpiringValue<string | undefined>>();
  private readonly exchanges = new Map<string, ExpiringValue<AuthSession>>();

  public async issueState(now = Date.now()): Promise<string> {
    return this.issueStateInternal(undefined, now);
  }

  public async issueStateForOrigin(returnOrigin: string, now = Date.now()): Promise<string> {
    return this.issueStateInternal(returnOrigin, now);
  }

  public async consumeState(state: string, now = Date.now()): Promise<boolean> {
    const entry = this.states.get(state);
    this.states.delete(state);
    return entry !== undefined && entry.expiresAt >= now;
  }

  public async consumeStateWithOrigin(state: string, now = Date.now()): Promise<string | undefined> {
    const entry = this.states.get(state);
    this.states.delete(state);
    return entry !== undefined && entry.expiresAt >= now ? entry.value : undefined;
  }

  public async issueExchange(session: AuthSession, now = Date.now()): Promise<string> {
    const code = randomBytes(32).toString("base64url");
    this.exchanges.set(code, { value: session, expiresAt: now + 60_000 });
    return code;
  }

  public async consumeExchange(code: string, now = Date.now()): Promise<AuthSession | undefined> {
    const entry = this.exchanges.get(code);
    this.exchanges.delete(code);
    return entry !== undefined && entry.expiresAt >= now ? entry.value : undefined;
  }

  private async issueStateInternal(returnOrigin: string | undefined, now: number): Promise<string> {
    const state = randomBytes(24).toString("base64url");
    this.states.set(state, { value: returnOrigin, expiresAt: now + 5 * 60_000 });
    return state;
  }
}

export function buildDiscordAuthorizationUrl(config: DiscordOAuthConfig, state: string): string {
  const url = new URL("https://discord.com/oauth2/authorize");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    scope: "identify email",
    state,
    redirect_uri: config.redirectUri,
    prompt: "consent",
  }).toString();
  return url.toString();
}
