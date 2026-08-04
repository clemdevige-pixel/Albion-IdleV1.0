import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { DataValidationError } from "./errors.js";
import { loadContentManifest } from "./loader.js";
import { ContentManifestSchema } from "./schemas/content-manifest.js";

const dirs: string[] = [];

async function writeTempJson(name: string, contents: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "albion-data-"));
  dirs.push(dir);
  const filePath = join(dir, name);
  await writeFile(filePath, contents, "utf8");
  return filePath;
}

afterAll(() => {
  dirs.length = 0;
});

describe("ContentManifestSchema", () => {
  it("accepts an empty-but-valid manifest", () => {
    const parsed = ContentManifestSchema.parse({ version: 1, collections: [] });
    expect(parsed.collections).toEqual([]);
  });

  it("rejects a collection id that is not kebab-case", () => {
    const result = ContentManifestSchema.safeParse({
      version: 1,
      collections: [{ id: "Not Kebab", kind: "items", entries: [] }],
    });
    expect(result.success).toBe(false);
  });
});

describe("loadContentManifest", () => {
  it("loads and validates a well-formed manifest file", async () => {
    const filePath = await writeTempJson(
      "manifest.json",
      JSON.stringify({ version: 1, collections: [] }),
    );
    const manifest = await loadContentManifest(filePath);
    expect(manifest.version).toBe(1);
  });

  it("throws DataValidationError on malformed JSON", async () => {
    const filePath = await writeTempJson("broken.json", "{ not json");
    await expect(loadContentManifest(filePath)).rejects.toBeInstanceOf(DataValidationError);
  });

  it("throws DataValidationError on schema violation", async () => {
    const filePath = await writeTempJson(
      "invalid.json",
      JSON.stringify({ version: -3, collections: "nope" }),
    );
    await expect(loadContentManifest(filePath)).rejects.toBeInstanceOf(DataValidationError);
  });

  it("throws DataValidationError when the file is missing", async () => {
    await expect(loadContentManifest("does/not/exist.json")).rejects.toBeInstanceOf(
      DataValidationError,
    );
  });
});
