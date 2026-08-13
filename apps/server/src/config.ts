import { z } from "zod";

const ClientOriginsSchema = z
  .string()
  .optional()
  .transform((value) => value === undefined
    ? []
    : value.split(",").map((entry) => entry.trim()).filter(Boolean))
  .pipe(z.array(z.string().url()));

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
  clientOrigin: z.string().url().default("http://localhost:5173"),
  clientOrigins: z.array(z.string().url()).default([]),
  authStorePath: z.string().min(1).default("apps/server/data/auth-store.json"),
  cloudSaveStorePath: z.string().min(1).default("apps/server/data/cloud-saves.json"),
  databaseUrl: z.string().url().optional(),
  discordClientId: z.string().min(1).optional(),
  discordClientSecret: z.string().min(1).optional(),
  discordRedirectUri: z.string().url().optional(),
}).superRefine((config, context) => {
  const configured = [config.discordClientId, config.discordClientSecret, config.discordRedirectUri];
  if (configured.some((value) => value !== undefined) && configured.some((value) => value === undefined)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Discord OAuth requires CLIENT_ID, CLIENT_SECRET and REDIRECT_URI" });
  }
  if (config.nodeEnv === "production" && config.databaseUrl === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Production authentication requires DATABASE_URL" });
  }
});

export type ServerConfig = z.infer<typeof ConfigSchema>;

/** Builds a validated {@link ServerConfig} from a raw environment map. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const parsedClientOrigins = ClientOriginsSchema.safeParse(env.CLIENT_ORIGINS);
  if (!parsedClientOrigins.success) {
    throw new Error(`Invalid server configuration: clientOrigins: ${parsedClientOrigins.error.issues.map((issue) => issue.message).join(", ")}`);
  }

  const result = ConfigSchema.safeParse({
    nodeEnv: env.NODE_ENV,
    host: env.SERVER_HOST,
    // Most managed hosts inject PORT. SERVER_PORT remains the explicit local
    // override so existing development environments keep their behaviour.
    port: env.SERVER_PORT ?? env.PORT,
    logLevel: env.LOG_LEVEL,
    clientOrigin: env.CLIENT_ORIGIN,
    clientOrigins: parsedClientOrigins.data,
    authStorePath: env.AUTH_STORE_PATH,
    cloudSaveStorePath: env.CLOUD_SAVE_STORE_PATH,
    databaseUrl: env.DATABASE_URL,
    discordClientId: env.DISCORD_CLIENT_ID,
    discordClientSecret: env.DISCORD_CLIENT_SECRET,
    discordRedirectUri: env.DISCORD_REDIRECT_URI,
  });

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server configuration: ${issues}`);
  }

  return result.data;
}
