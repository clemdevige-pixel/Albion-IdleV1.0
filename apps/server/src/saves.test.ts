import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  AUTH_REGISTER_ROUTE,
  CLOUD_SAVES_ROUTE,
  AuthSessionSchema,
  type CloudSaveDocument,
} from "@game/shared";
import { buildServer } from "./app.js";

function makeSave(updatedAt: number, marker: string): CloudSaveDocument {
  return {
    version: 1,
    metadata: {
      version: 1,
      createdAt: updatedAt - 1,
      updatedAt,
      buildVersion: "test",
      seed: 42,
    },
    payload: { marker },
    checksum: `checksum-${marker}`,
  };
}

async function register(app: FastifyInstance, email: string): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: AUTH_REGISTER_ROUTE,
    payload: { email, password: "correct-horse", displayName: "Hero" },
  });
  return AuthSessionSchema.parse(response.json()).token;
}

describe("authenticated cloud saves", () => {
  const apps: FastifyInstance[] = [];
  afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

  it("stores, lists, restores and deletes one account-owned slot with server-authoritative timing", async () => {
    const app = buildServer({ logLevel: "fatal" });
    apps.push(app);
    const token = await register(app, "cloud@example.com");
    const headers = { authorization: `Bearer ${token}` };
    const save = makeSave(200, "latest");

    const stored = await app.inject({ method: "PUT", url: `${CLOUD_SAVES_ROUTE}/player_slot_1`, headers, payload: save });
    expect(stored.statusCode).toBe(200);
    const storedBody = stored.json() as { accepted: boolean; updatedAt: number; serverSavedAt: number };
    expect(storedBody.accepted).toBe(true);
    expect(storedBody.updatedAt).toBe(200);
    expect(Number.isSafeInteger(storedBody.serverSavedAt)).toBe(true);

    const list = await app.inject({ method: "GET", url: CLOUD_SAVES_ROUTE, headers });
    expect(list.json()).toEqual({ saves: [{ slotId: "player_slot_1", updatedAt: 200 }] });

    const restored = await app.inject({ method: "GET", url: `${CLOUD_SAVES_ROUTE}/player_slot_1`, headers });
    const restoredBody = restored.json() as CloudSaveDocument;
    expect(restoredBody.payload).toEqual(save.payload);
    expect(restoredBody.metadata.updatedAt).toBe(200);
    expect(restoredBody.metadata.extra?.serverSavedAt).toBe(storedBody.serverSavedAt);
    expect(typeof restoredBody.metadata.extra?.serverNow).toBe("number");
    expect(Number(restoredBody.metadata.extra?.serverNow)).toBeGreaterThanOrEqual(storedBody.serverSavedAt);

    const deleted = await app.inject({ method: "DELETE", url: `${CLOUD_SAVES_ROUTE}/player_slot_1`, headers });
    expect(deleted.statusCode).toBe(204);
    const missing = await app.inject({ method: "GET", url: `${CLOUD_SAVES_ROUTE}/player_slot_1`, headers });
    expect(missing.statusCode).toBe(404);
  });

  it("rejects unauthenticated access and isolates accounts", async () => {
    const app = buildServer({ logLevel: "fatal" });
    apps.push(app);
    expect((await app.inject({ method: "GET", url: CLOUD_SAVES_ROUTE })).statusCode).toBe(401);

    const firstToken = await register(app, "first@example.com");
    const secondToken = await register(app, "second@example.com");
    await app.inject({
      method: "PUT",
      url: `${CLOUD_SAVES_ROUTE}/player_slot_2`,
      headers: { authorization: `Bearer ${firstToken}` },
      payload: makeSave(100, "private"),
    });
    const secondList = await app.inject({
      method: "GET",
      url: CLOUD_SAVES_ROUTE,
      headers: { authorization: `Bearer ${secondToken}` },
    });
    expect(secondList.json()).toEqual({ saves: [] });
  });

  it("does not overwrite a newer cloud save with an older document", async () => {
    const app = buildServer({ logLevel: "fatal" });
    apps.push(app);
    const token = await register(app, "conflict@example.com");
    const headers = { authorization: `Bearer ${token}` };
    await app.inject({ method: "PUT", url: `${CLOUD_SAVES_ROUTE}/player_slot_3`, headers, payload: makeSave(500, "new") });
    const stale = await app.inject({ method: "PUT", url: `${CLOUD_SAVES_ROUTE}/player_slot_3`, headers, payload: makeSave(400, "old") });
    expect(stale.json()).toMatchObject({ accepted: false });
    const restored = await app.inject({ method: "GET", url: `${CLOUD_SAVES_ROUTE}/player_slot_3`, headers });
    expect(restored.json()).toMatchObject({ payload: { marker: "new" } });
  });
});
