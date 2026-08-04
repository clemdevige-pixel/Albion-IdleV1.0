import { z } from "zod";

/**
 * Server configuration, validated at startup.
 *
 * Invalid or missing required environment variables fail loudly here rather
 * than surfacing as obscure runtime errors later.
 */
const ConfigSchema = z.object({
  nodeEnv: z.enum(["development", "test", "production"]).default("development"),
  host: z.string().min(1).default("127.0.0.1"),
  port: z.coerce.number().int().min(0).max(65535).default(3000),
  logLevel: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type ServerConfig = z.infer<typeof ConfigSchema>;

/** Builds a validated {@link ServerConfig} from a raw environment map. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const result = ConfigSchema.safeParse({
    nodeEnv: env.NODE_ENV,
    host: env.SERVER_HOST,
    port: env.SERVER_PORT,
    logLevel: env.LOG_LEVEL,
  });

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server configuration: ${issues}`);
  }

  return result.data;
}
