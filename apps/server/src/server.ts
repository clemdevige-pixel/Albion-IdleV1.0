import { buildServer } from "./app.js";
import { loadConfig } from "./config.js";

/** Process entry point: load config, build the app, and start listening. */
async function start(): Promise<void> {
  const config = loadConfig();
  const app = buildServer({ logLevel: config.logLevel });

  try {
    await app.listen({ host: config.host, port: config.port });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}

void start();
