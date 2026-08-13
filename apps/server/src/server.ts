import { buildServer } from "./app.js";
import { loadConfig } from "./config.js";
import { resolve } from "node:path";
import { FileAuthRepository } from "./auth/FileAuthRepository.js";
import { PostgresAuthRepository } from "./auth/PostgresAuthRepository.js";
import { PostgresDiscordOAuthFlowStore } from "./auth/PostgresDiscordOAuthFlowStore.js";
import postgres from "postgres";
import { FileCloudSaveRepository } from "./saves/FileCloudSaveRepository.js";
import { PostgresCloudSaveRepository } from "./saves/PostgresCloudSaveRepository.js";

/** Process entry point: load config, build the app, and start listening. */
async function start(): Promise<void> {
  const config = loadConfig();
  const discordConfig = config.discordClientId === undefined ? undefined : {
    clientId: config.discordClientId,
    clientSecret: config.discordClientSecret!,
    redirectUri: config.discordRedirectUri!,
  };
  const sql = config.databaseUrl === undefined
    ? undefined
    : postgres(config.databaseUrl, { max: 10, idle_timeout: 20, connect_timeout: 10 });
  const authRepository = sql === undefined
    ? new FileAuthRepository(resolve(process.cwd(), config.authStorePath))
    : await PostgresAuthRepository.create(sql);
  const discordFlowStore = sql === undefined
    ? undefined
    : await PostgresDiscordOAuthFlowStore.create(sql);
  const cloudSaveRepository = sql === undefined
    ? new FileCloudSaveRepository(resolve(process.cwd(), config.cloudSaveStorePath))
    : await PostgresCloudSaveRepository.create(sql);
  const app = buildServer({
    logLevel: config.logLevel,
    clientOrigin: config.clientOrigin,
    authRepository,
    cloudSaveRepository,
    ...(discordConfig === undefined ? {} : { discordConfig }),
    ...(discordFlowStore === undefined ? {} : { discordFlowStore }),
  });
  if (sql !== undefined) app.addHook("onClose", async () => { await sql.end(); });

  try {
    await app.listen({ host: config.host, port: config.port });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}

void start();
