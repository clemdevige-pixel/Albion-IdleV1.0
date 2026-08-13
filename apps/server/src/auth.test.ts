import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  AUTH_LOGIN_ROUTE,
  AUTH_LOGOUT_ROUTE,
  AUTH_REGISTER_ROUTE,
  AUTH_SESSION_ROUTE,
  AUTH_PROVIDERS_ROUTE,
  AUTH_DISCORD_START_ROUTE,
  AUTH_DISCORD_CALLBACK_ROUTE,
  AUTH_DISCORD_EXCHANGE_ROUTE,
  AuthSessionSchema,
} from "@game/shared";
import { buildServer } from "./app.js";
import type { DiscordOAuthClient } from "./auth/DiscordOAuth.js";

describe("authentication endpoints", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildServer({ logLevel: "fatal" });
    await app.ready();
  });

  afterAll(async () => { await app.close(); });

  it("registers, restores and closes a server-side session", async () => {
    const registration = await app.inject({
      method: "POST",
      url: AUTH_REGISTER_ROUTE,
      payload: { email: "Hero@Example.com", password: "correct-horse", displayName: "Hero" },
    });
    expect(registration.statusCode).toBe(200);
    const session = AuthSessionSchema.parse(registration.json());
    expect(session.account.email).toBe("hero@example.com");
    expect(registration.body).not.toContain("passwordHash");

    const restored = await app.inject({
      method: "GET",
      url: AUTH_SESSION_ROUTE,
      headers: { authorization: `Bearer ${session.token}` },
    });
    expect(restored.statusCode).toBe(200);
    expect(restored.json()).toMatchObject({ account: { id: session.account.id } });

    const logout = await app.inject({
      method: "POST",
      url: AUTH_LOGOUT_ROUTE,
      headers: { authorization: `Bearer ${session.token}` },
    });
    expect(logout.statusCode).toBe(204);

    const rejected = await app.inject({
      method: "GET",
      url: AUTH_SESSION_ROUTE,
      headers: { authorization: `Bearer ${session.token}` },
    });
    expect(rejected.statusCode).toBe(401);
  });

  it("rejects duplicate accounts and invalid credentials", async () => {
    const duplicate = await app.inject({
      method: "POST",
      url: AUTH_REGISTER_ROUTE,
      payload: { email: "hero@example.com", password: "another-password", displayName: "Other" },
    });
    expect(duplicate.statusCode).toBe(409);

    const invalidLogin = await app.inject({
      method: "POST",
      url: AUTH_LOGIN_ROUTE,
      payload: { email: "hero@example.com", password: "wrong-password" },
    });
    expect(invalidLogin.statusCode).toBe(401);

    const validLogin = await app.inject({
      method: "POST",
      url: AUTH_LOGIN_ROUTE,
      payload: { email: "hero@example.com", password: "correct-horse" },
    });
    expect(validLogin.statusCode).toBe(200);
    AuthSessionSchema.parse(validLogin.json());
  });
});

describe("Discord authentication", () => {
  const discordClient: DiscordOAuthClient = {
    async exchangeCode() {
      return {
        id: "discord-user-42",
        username: "discord-hero",
        globalName: "Discord Hero",
        email: "discord@example.com",
        emailVerified: true,
      };
    },
  };

  it("reports the provider as disabled without server credentials", async () => {
    const app = buildServer({ logLevel: "fatal" });
    const response = await app.inject({ method: "GET", url: AUTH_PROVIDERS_ROUTE });
    expect(response.json()).toEqual({ discord: { enabled: false } });
    await app.close();
  });

  it("validates state and exchanges a one-time browser code for a session", async () => {
    const app = buildServer({
      logLevel: "fatal",
      clientOrigin: "http://localhost:5173",
      discordConfig: {
        clientId: "discord-client",
        clientSecret: "server-secret",
        redirectUri: "http://localhost:3000/auth/discord/callback",
      },
      discordClient,
    });

    const provider = await app.inject({ method: "GET", url: AUTH_PROVIDERS_ROUTE });
    expect(provider.json()).toEqual({ discord: { enabled: true } });

    const start = await app.inject({ method: "GET", url: AUTH_DISCORD_START_ROUTE });
    expect(start.statusCode).toBe(302);
    const authorizationUrl = new URL(start.headers.location!);
    const state = authorizationUrl.searchParams.get("state");
    expect(state).not.toBeNull();
    expect(authorizationUrl.searchParams.get("scope")).toBe("identify email");

    const callback = await app.inject({
      method: "GET",
      url: `${AUTH_DISCORD_CALLBACK_ROUTE}?code=discord-code&state=${encodeURIComponent(state!)}`,
    });
    expect(callback.statusCode).toBe(302);
    const browserReturn = new URL(callback.headers.location!);
    const exchangeCode = browserReturn.searchParams.get("discord_auth_code");
    expect(exchangeCode).not.toBeNull();

    const exchange = await app.inject({
      method: "POST",
      url: AUTH_DISCORD_EXCHANGE_ROUTE,
      payload: { code: exchangeCode },
    });
    expect(exchange.statusCode).toBe(200);
    const session = AuthSessionSchema.parse(exchange.json());
    expect(session.account).toMatchObject({ email: "discord@example.com", displayName: "Discord Hero" });

    const replay = await app.inject({
      method: "POST",
      url: AUTH_DISCORD_EXCHANGE_ROUTE,
      payload: { code: exchangeCode },
    });
    expect(replay.statusCode).toBe(401);

    await app.close();
  });
});
