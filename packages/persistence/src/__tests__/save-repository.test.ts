import { describe, it, expect } from "vitest";
import { InMemorySaveRepository } from "../save-repository.js";
import { SaveNotFoundError } from "../errors.js";
import { computeChecksum } from "../serializer.js";
import type { SaveFormat } from "../save-format.js";

function makeSave(): SaveFormat {
  const payload = { data: 1 };
  return {
    version: 1,
    metadata: {
      version: 1,
      createdAt: 0,
      updatedAt: 0,
      buildVersion: "0.1.0",
      seed: 42,
    },
    payload,
    checksum: computeChecksum(payload),
  };
}

describe("InMemorySaveRepository", () => {
  it("stores and retrieves saves", () => {
    const repo = new InMemorySaveRepository();
    const save = makeSave();
    repo.save("s1", save);
    expect(repo.get("s1")).toBe(save);
  });

  it("lists save ids", () => {
    const repo = new InMemorySaveRepository();
    repo.save("a", makeSave());
    repo.save("b", makeSave());
    expect(repo.list()).toEqual(["a", "b"]);
  });

  it("checks existence", () => {
    const repo = new InMemorySaveRepository();
    expect(repo.has("x")).toBe(false);
    repo.save("x", makeSave());
    expect(repo.has("x")).toBe(true);
  });

  it("deletes saves", () => {
    const repo = new InMemorySaveRepository();
    repo.save("d", makeSave());
    repo.delete("d");
    expect(repo.has("d")).toBe(false);
  });

  it("throws on get missing", () => {
    const repo = new InMemorySaveRepository();
    expect(() => repo.get("nope")).toThrow(SaveNotFoundError);
  });

  it("throws on delete missing", () => {
    const repo = new InMemorySaveRepository();
    expect(() => repo.delete("nope")).toThrow(SaveNotFoundError);
  });
});
