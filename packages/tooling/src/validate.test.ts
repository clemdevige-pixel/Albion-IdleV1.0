import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { DataValidationError } from "@game/data";
import { validateData, CONTENT_MANIFEST_RELATIVE } from "./validate-data.js";
import { validateAssets, ASSET_MANIFEST_RELATIVE } from "./validate-assets.js";

async function makeRepo(files: Record<string, unknown>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "albion-tooling-"));
  for (const [relative, contents] of Object.entries(files)) {
    const filePath = join(root, relative);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(contents), "utf8");
  }
  return root;
}

describe("validateData", () => {
  it("validates an empty content manifest", async () => {
    const root = await makeRepo({ [CONTENT_MANIFEST_RELATIVE]: { version: 1, collections: [] } });
    const summary = await validateData(root);
    expect(summary).toMatchObject({ collectionCount: 0, entryCount: 0 });
  });

  it("counts entries across collections", async () => {
    const root = await makeRepo({
      [CONTENT_MANIFEST_RELATIVE]: {
        version: 1,
        collections: [{ id: "items", kind: "item", entries: [{ id: "a" }, { id: "b" }] }],
      },
    });
    const summary = await validateData(root);
    expect(summary.entryCount).toBe(2);
  });

  it("rejects duplicate entry ids within a collection", async () => {
    const root = await makeRepo({
      [CONTENT_MANIFEST_RELATIVE]: {
        version: 1,
        collections: [{ id: "items", kind: "item", entries: [{ id: "dup" }, { id: "dup" }] }],
      },
    });
    await expect(validateData(root)).rejects.toBeInstanceOf(DataValidationError);
  });
});

describe("validateAssets", () => {
  it("validates an empty asset manifest", async () => {
    const root = await makeRepo({ [ASSET_MANIFEST_RELATIVE]: { version: 1, assets: [] } });
    const summary = await validateAssets(root);
    expect(summary.assetCount).toBe(0);
  });

  it("rejects duplicate asset ids", async () => {
    const root = await makeRepo({
      [ASSET_MANIFEST_RELATIVE]: {
        version: 1,
        assets: [
          { id: "hero", type: "sprite", path: "hero.png" },
          { id: "hero", type: "sprite", path: "hero2.png" },
        ],
      },
    });
    await expect(validateAssets(root)).rejects.toBeInstanceOf(DataValidationError);
  });
});
