import type { FastifyInstance } from "fastify";
import { API_VERSION, HEALTH_ROUTE, type HealthStatus } from "@game/shared";

/**
 * Registers the technical health endpoint.
 *
 * This is a thin transport adapter: it only assembles the shared
 * {@link HealthStatus} contract. No domain logic lives here.
 */
export function registerHealthRoute(app: FastifyInstance): void {
  app.get(HEALTH_ROUTE, (): HealthStatus => {
    return {
      status: "ok",
      apiVersion: API_VERSION,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  });
}
