import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AUTH_LOGIN_ROUTE,
  AUTH_LOGOUT_ROUTE,
  AUTH_REGISTER_ROUTE,
  AUTH_SESSION_ROUTE,
  AUTH_PROVIDERS_ROUTE,
  AUTH_DISCORD_START_ROUTE,
  AUTH_DISCORD_CALLBACK_ROUTE,
  AUTH_DISCORD_EXCHANGE_ROUTE,
  DiscordExchangeRequestSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
} from "@game/shared";
import { AuthFailure } from "../auth/AuthService.js";
import type { AuthService } from "../auth/AuthService.js";
import {
  buildDiscordAuthorizationUrl,
  DiscordOAuthFlowStore,
  type DiscordOAuthClient,
  type DiscordOAuthConfig,
  type DiscordOAuthFlowRepository,
} from "../auth/DiscordOAuth.js";

export interface DiscordRouteOptions {
  readonly config: DiscordOAuthConfig;
  readonly client: DiscordOAuthClient;
  readonly clientOrigin: string;
  readonly allowedClientOrigins: readonly string[];
  readonly flowStore?: DiscordOAuthFlowRepository;
}

function getBearerToken(request: FastifyRequest): string | undefined {
  const authorization = request.headers.authorization;
  if (authorization === undefined || !authorization.startsWith("Bearer ")) return undefined;
  const token = authorization.slice("Bearer ".length).trim();
  return token.length === 0 ? undefined : token;
}

function sendFailure(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof AuthFailure) {
    const status = error.code === "EMAIL_ALREADY_USED" ? 409 : 401;
    return reply.status(status).send({ code: error.code, message: error.message });
  }
  return reply.status(500).send({ code: "UNAUTHORIZED", message: "Erreur d'authentification." });
}

export function registerAuthRoutes(app: FastifyInstance, auth: AuthService, discord?: DiscordRouteOptions): void {
  const discordFlow = discord?.flowStore ?? new DiscordOAuthFlowStore();

  app.get(AUTH_PROVIDERS_ROUTE, () => ({ discord: { enabled: discord !== undefined } }));
  app.post(AUTH_REGISTER_ROUTE, async (request, reply) => {
    const parsed = RegisterRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: "INVALID_REQUEST", message: "Informations de compte invalides." });
    }
    try { return await auth.register(parsed.data); }
    catch (error) { return sendFailure(reply, error); }
  });

  app.post(AUTH_LOGIN_ROUTE, async (request, reply) => {
    const parsed = LoginRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: "INVALID_REQUEST", message: "Identifiants invalides." });
    }
    try { return await auth.login(parsed.data); }
    catch (error) { return sendFailure(reply, error); }
  });

  app.get(AUTH_SESSION_ROUTE, async (request, reply) => {
    const token = getBearerToken(request);
    if (token === undefined) return reply.status(401).send({ code: "UNAUTHORIZED", message: "Session requise." });
    try { return { account: await auth.getAccount(token) }; }
    catch (error) { return sendFailure(reply, error); }
  });

  app.post(AUTH_LOGOUT_ROUTE, async (request, reply) => {
    const token = getBearerToken(request);
    if (token !== undefined) await auth.logout(token);
    return reply.status(204).send();
  });

  app.get(AUTH_DISCORD_START_ROUTE, async (request, reply) => {
    if (discord === undefined) return reply.status(503).send({ code: "PROVIDER_UNAVAILABLE", message: "Discord n'est pas configuré." });
    const query = request.query as { return_origin?: unknown };
    const requestedOrigin = typeof query.return_origin === "string" ? query.return_origin : discord.clientOrigin;
    if (!discord.allowedClientOrigins.includes(requestedOrigin)) {
      return reply.status(400).send({ code: "INVALID_REQUEST", message: "Origine de retour non autorisée." });
    }
    const state = await discordFlow.issueStateForOrigin(requestedOrigin);
    return reply.redirect(buildDiscordAuthorizationUrl(discord.config, state));
  });

  app.get(AUTH_DISCORD_CALLBACK_ROUTE, async (request, reply) => {
    if (discord === undefined) return reply.status(503).send({ code: "PROVIDER_UNAVAILABLE", message: "Discord n'est pas configuré." });
    const query = request.query as { code?: unknown; state?: unknown };
    if (typeof query.code !== "string" || typeof query.state !== "string") {
      return reply.status(400).send({ code: "OAUTH_FAILED", message: "Retour Discord invalide ou expiré." });
    }
    const returnOrigin = await discordFlow.consumeStateWithOrigin(query.state);
    if (returnOrigin === undefined || !discord.allowedClientOrigins.includes(returnOrigin)) {
      return reply.status(400).send({ code: "OAUTH_FAILED", message: "Retour Discord invalide ou expiré." });
    }
    try {
      const identity = await discord.client.exchangeCode(query.code);
      const exchangeCode = await discordFlow.issueExchange(await auth.loginWithDiscord(identity));
      const destination = new URL(returnOrigin);
      destination.searchParams.set("discord_auth_code", exchangeCode);
      return reply.redirect(destination.toString());
    } catch {
      return reply.status(502).send({ code: "OAUTH_FAILED", message: "Connexion à Discord impossible." });
    }
  });

  app.post(AUTH_DISCORD_EXCHANGE_ROUTE, async (request, reply) => {
    const parsed = DiscordExchangeRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ code: "INVALID_REQUEST", message: "Code de connexion invalide." });
    const session = await discordFlow.consumeExchange(parsed.data.code);
    return session === undefined
      ? reply.status(401).send({ code: "UNAUTHORIZED", message: "Code de connexion invalide ou expiré." })
      : session;
  });
}
