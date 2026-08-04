import Fastify, { type FastifyInstance } from "fastify";
import type { ServerConfig } from "./config.js";
import { registerHealthRoute } from "./routes/health.js";

export interface BuildServerOptions {
  logLevel?: ServerConfig["logLevel"];
}

/**
 * Constructs a fully-configured but not-yet-listening Fastify instance.
 *
 * Separated from network start-up so it can be exercised in tests via
 * `app.inject(...)` without binding a port.
 */
export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: { level: options.logLevel ?? "info" },
  });

  // Technical routes only for Phase 01.
  registerHealthRoute(app);

  return app;
}
