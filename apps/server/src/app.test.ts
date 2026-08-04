import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { API_VERSION, HEALTH_ROUTE, HealthStatusSchema } from "@game/shared";
import { buildServer } from "./app.js";

describe("server health endpoint", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildServer({ logLevel: "fatal" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("responds 200 with a payload matching the shared contract", async () => {
    const response = await app.inject({ method: "GET", url: HEALTH_ROUTE });

    expect(response.statusCode).toBe(200);

    // The response must satisfy the contract consumed by the client.
    const parsed = HealthStatusSchema.parse(response.json());
    expect(parsed.status).toBe("ok");
    expect(parsed.apiVersion).toBe(API_VERSION);
  });
});
