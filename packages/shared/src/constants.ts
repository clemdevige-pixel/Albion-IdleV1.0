/**
 * Technical constants shared by client and server.
 *
 * These are transport / protocol level values only. No gameplay values live here.
 */

/** Version of the HTTP API contract exposed by the server. */
export const API_VERSION = "1" as const;

/** Canonical path of the liveness/health endpoint. */
export const HEALTH_ROUTE = "/health" as const;

/** Authentication routes. Identity remains server-authoritative. */
export const AUTH_REGISTER_ROUTE = "/auth/register" as const;
export const AUTH_LOGIN_ROUTE = "/auth/login" as const;
export const AUTH_SESSION_ROUTE = "/auth/session" as const;
export const AUTH_LOGOUT_ROUTE = "/auth/logout" as const;
export const AUTH_PROVIDERS_ROUTE = "/auth/providers" as const;
export const AUTH_DISCORD_START_ROUTE = "/auth/discord" as const;
export const AUTH_DISCORD_CALLBACK_ROUTE = "/auth/discord/callback" as const;
export const AUTH_DISCORD_EXCHANGE_ROUTE = "/auth/discord/exchange" as const;
export const CLOUD_SAVES_ROUTE = "/saves" as const;
