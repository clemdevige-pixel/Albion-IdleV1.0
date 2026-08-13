import {
  AUTH_DISCORD_EXCHANGE_ROUTE,
  AUTH_DISCORD_START_ROUTE,
  AUTH_LOGIN_ROUTE,
  AUTH_LOGOUT_ROUTE,
  AUTH_PROVIDERS_ROUTE,
  AUTH_REGISTER_ROUTE,
  AUTH_SESSION_ROUTE,
  AuthErrorSchema,
  AuthProvidersSchema,
  AuthSessionSchema,
  AccountSchema,
  type AuthProviders,
  type AuthSession,
  type LoginRequest,
  type RegisterRequest,
} from "@game/shared";

const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN as string | undefined)?.replace(/\/$/, "") ?? "";

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const payload = await response.json() as unknown;
  if (!response.ok) {
    const error = AuthErrorSchema.safeParse(payload);
    throw new Error(error.success ? error.data.message : "Le serveur d'authentification ne répond pas.");
  }
  return payload;
}

export class AuthClient {
  private endpoint(path: string): string { return `${API_ORIGIN}${path}`; }

  public async providers(): Promise<AuthProviders> {
    return AuthProvidersSchema.parse(await parseResponse(await fetch(this.endpoint(AUTH_PROVIDERS_ROUTE))));
  }

  public async register(input: RegisterRequest): Promise<AuthSession> {
    return this.postSession(AUTH_REGISTER_ROUTE, input);
  }

  public async login(input: LoginRequest): Promise<AuthSession> {
    return this.postSession(AUTH_LOGIN_ROUTE, input);
  }

  public async restore(token: string): Promise<AuthSession["account"]> {
    const response = await fetch(this.endpoint(AUTH_SESSION_ROUTE), { headers: { authorization: `Bearer ${token}` } });
    const payload = await parseResponse(response) as { account?: unknown };
    return AccountSchema.parse(payload.account);
  }

  public async exchangeDiscordCode(code: string): Promise<AuthSession> {
    return this.postSession(AUTH_DISCORD_EXCHANGE_ROUTE, { code });
  }

  public async logout(token: string): Promise<void> {
    await parseResponse(await fetch(this.endpoint(AUTH_LOGOUT_ROUTE), {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    }));
  }

  public discordAuthorizationUrl(): string { return this.endpoint(AUTH_DISCORD_START_ROUTE); }

  private async postSession(path: string, body: unknown): Promise<AuthSession> {
    const response = await fetch(this.endpoint(path), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return AuthSessionSchema.parse(await parseResponse(response));
  }
}
