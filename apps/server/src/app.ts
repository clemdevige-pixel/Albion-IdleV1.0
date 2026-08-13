import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import type { ServerConfig } from "./config.js";
import { registerHealthRoute } from "./routes/health.js";
import { AuthService } from "./auth/AuthService.js";
import { InMemoryAuthRepository, type AuthRepository } from "./auth/AuthRepository.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { DiscordHttpOAuthClient, type DiscordOAuthClient, type DiscordOAuthConfig } from "./auth/DiscordOAuth.js";
import type { DiscordOAuthFlowRepository } from "./auth/DiscordOAuth.js";
import { InMemoryCloudSaveRepository, type CloudSaveRepository } from "./saves/CloudSaveRepository.js";
import { registerSaveRoutes } from "./routes/saves.js";

export interface BuildServerOptions {
  logLevel?: ServerConfig["logLevel"];
  authRepository?: AuthRepository;
  discordConfig?: DiscordOAuthConfig;
  discordClient?: DiscordOAuthClient;
  discordFlowStore?: DiscordOAuthFlowRepository;
  clientOrigin?: string;
  cloudSaveRepository?: CloudSaveRepository;
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

  void app.register(cors, {
    origin: options.clientOrigin ?? "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });

  registerHealthRoute(app);
  const auth = new AuthService(options.authRepository ?? new InMemoryAuthRepository());
  const discord = options.discordConfig === undefined ? undefined : {
    config: options.discordConfig,
    client: options.discordClient ?? new DiscordHttpOAuthClient(options.discordConfig),
    clientOrigin: options.clientOrigin ?? "http://localhost:5173",
    ...(options.discordFlowStore === undefined ? {} : { flowStore: options.discordFlowStore }),
  };
  registerAuthRoutes(app, auth, discord);
  registerSaveRoutes(app, auth, options.cloudSaveRepository ?? new InMemoryCloudSaveRepository());

  return app;
}
