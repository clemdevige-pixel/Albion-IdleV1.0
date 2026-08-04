import type { ZodType } from "zod";
import type { DataId } from "./data-id.js";

/** Reference from one record to another category's record. */
export interface DataReference {
  readonly targetCategory: string;
  readonly targetId: string;
}

/**
 * Describes a category of data records: its schema, version, ID extraction,
 * and optional reference extraction.
 */
export interface DataCategory<TRecord, TCategory extends string = string> {
  readonly category: TCategory;
  readonly schema: ZodType<TRecord>;
  readonly version: number;
  getId(record: TRecord): DataId<TCategory>;
  getReferences?(record: TRecord): ReadonlyArray<DataReference>;
}

/** Options for {@link defineDataCategory}. */
export interface DataCategoryOptions<TRecord, TCategory extends string> {
  readonly category: TCategory;
  readonly schema: ZodType<TRecord>;
  readonly version: number;
  getId(record: TRecord): DataId<TCategory>;
  getReferences?(record: TRecord): ReadonlyArray<DataReference>;
}

/** Factory for creating a DataCategory descriptor. */
export function defineDataCategory<TRecord, TCategory extends string>(
  opts: DataCategoryOptions<TRecord, TCategory>,
): DataCategory<TRecord, TCategory> {
  const getId = (r: TRecord): DataId<TCategory> => opts.getId(r);
  if (opts.getReferences) {
    return {
      category: opts.category,
      schema: opts.schema,
      version: opts.version,
      getId,
      getReferences: (r: TRecord) => opts.getReferences!(r),
    };
  }
  return {
    category: opts.category,
    schema: opts.schema,
    version: opts.version,
    getId,
  };
}
