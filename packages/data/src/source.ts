import { readFile } from "node:fs/promises";

/** An abstract source of raw JSON data. */
export interface DataSource {
  readonly sourceId: string;
  load(): Promise<unknown>;
}

/** Creates a DataSource that reads a JSON file from disk. */
export function createJsonFileSource(sourceId: string, filePath: string): DataSource {
  return {
    sourceId,
    async load(): Promise<unknown> {
      const raw = await readFile(filePath, "utf8");
      return JSON.parse(raw) as unknown;
    },
  };
}

/** Creates a DataSource backed by an in-memory value (useful for tests). */
export function createInMemorySource(sourceId: string, data: unknown): DataSource {
  return {
    sourceId,
    load(): Promise<unknown> {
      return Promise.resolve(data);
    },
  };
}
