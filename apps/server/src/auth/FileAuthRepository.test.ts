import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { FileAuthRepository } from "./FileAuthRepository.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function createStorePath(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "albion-auth-"));
  temporaryDirectories.push(directory);
  return join(directory, "nested", "auth-store.json");
}

describe("FileAuthRepository", () => {
  it("persists accounts and sessions across repository instances", async () => {
    const path = await createStorePath();
    const account = {
      id: "0a77bbaa-9e05-4be8-b4ea-7a72f72aaed4",
      email: "hero@example.com",
      displayName: "Hero",
      createdAt: "2026-08-13T08:00:00.000Z",
      passwordHash: "salt:hash",
      discordId: "discord-42",
    } as const;
    const first = new FileAuthRepository(path);
    await first.saveAccount(account);
    await first.saveSession("hashed-token", account.id, "2099-01-01T00:00:00.000Z");

    const second = new FileAuthRepository(path);
    await expect(second.findAccountByEmail(account.email)).resolves.toEqual(account);
    await expect(second.findAccountByDiscordId("discord-42")).resolves.toEqual(account);
    await expect(second.findSessionAccountId("hashed-token")).resolves.toBe(account.id);

    const raw = await readFile(path, "utf8");
    expect(raw).not.toContain("plain-token");
    expect(JSON.parse(raw)).toMatchObject({ version: 1 });
  });

  it("rejects expired sessions and removes them durably", async () => {
    const path = await createStorePath();
    const repository = new FileAuthRepository(path);
    await repository.saveSession(
      "expired-token",
      "0a77bbaa-9e05-4be8-b4ea-7a72f72aaed4",
      "2020-01-01T00:00:00.000Z",
    );
    await expect(repository.findSessionAccountId("expired-token")).resolves.toBeUndefined();

    const reloaded = new FileAuthRepository(path);
    await expect(reloaded.findSessionAccountId("expired-token")).resolves.toBeUndefined();
  });

  it("fails closed when the durable store is corrupted", async () => {
    const path = await createStorePath();
    const repository = new FileAuthRepository(path);
    await repository.saveSession(
      "bootstrap",
      "0a77bbaa-9e05-4be8-b4ea-7a72f72aaed4",
      "2099-01-01T00:00:00.000Z",
    );
    await import("node:fs/promises").then(({ writeFile }) => writeFile(path, "not-json", "utf8"));
    const corrupted = new FileAuthRepository(path);
    await expect(corrupted.findAccountById("anything")).rejects.toThrow("Unable to load authentication store");
  });
});
