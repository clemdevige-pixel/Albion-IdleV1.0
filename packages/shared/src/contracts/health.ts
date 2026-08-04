import { z } from "zod";

/**
 * Contract for the technical health-check endpoint.
 *
 * This is a transport DTO: it is validated with Zod so both the server (producer)
 * and the client (consumer) share a single source of truth for the shape.
 */
export const HealthStatusSchema = z.object({
  /** Overall service status. `ok` means the process is up and serving requests. */
  status: z.literal("ok"),
  /** Version of the API contract, mirrored from {@link API_VERSION}. */
  apiVersion: z.string().min(1),
  /** Server-side timestamp (ISO 8601) at the moment the response was produced. */
  timestamp: z.string().datetime(),
  /** Process uptime in whole seconds. */
  uptimeSeconds: z.number().int().nonnegative(),
});

export type HealthStatus = z.infer<typeof HealthStatusSchema>;
