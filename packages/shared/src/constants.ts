/**
 * Technical constants shared by client and server.
 *
 * These are transport / protocol level values only. No gameplay values live here.
 */

/** Version of the HTTP API contract exposed by the server. */
export const API_VERSION = "1" as const;

/** Canonical path of the liveness/health endpoint. */
export const HEALTH_ROUTE = "/health" as const;
