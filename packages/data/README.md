# @game/data — Data Runtime

Schema definitions, validating loaders, and immutable registries for game content data.

## Architecture

The Data Runtime provides a pipeline for loading, validating, and serving static game data:

```
Source → Parse → Schema Validation → ID Validation → Duplicate Detection
  → Reference Resolution → Semantic Validation → Registry Construction
```

## Data File Format

All data files use a standard JSON envelope:

```json
{
  "version": 1,
  "category": "items",
  "definitions": [
    { "id": "sword_t1", "name": "Sword", "tier": 1 }
  ]
}
```

- **version**: integer, must match the category's declared version
- **category**: string matching a registered `DataCategory`
- **definitions**: array of records validated against the category's Zod schema

## IDs

All record IDs are lowercase snake_case strings matching `/^[a-z][a-z0-9_]*$/`. IDs are branded types (`DataId<TCategory>`) distinct from runtime `EntityId`.

## Key Types

- **`DataCategory<TRecord, TCategory>`** — declares a content family: schema, version, ID extractor, optional reference extractor
- **`DataRegistry<TRecord, TCategory>`** — immutable O(1) lookup by ID, sorted iteration
- **`DataSource`** — abstract data provider (file or in-memory)
- **`SemanticValidator`** — custom cross-record validation rules
- **`ValidationResult<T>`** — discriminated success/failure with typed issues

## Usage

```typescript
import { z } from "zod";
import { defineDataCategory, loadData, createInMemorySource, asDataId } from "@game/data";

const ItemSchema = z.object({ id: z.string(), name: z.string(), tier: z.number() });

const itemCategory = defineDataCategory({
  category: "items" as const,
  schema: ItemSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
});

const result = await loadData({
  categories: [itemCategory],
  sources: [createJsonFileSource("items", "content/data/items.json")],
});

if (result.success) {
  const registry = result.value.getRegistry(itemCategory);
  const sword = registry.get(asDataId("sword_t1"));
}
```

## Validation

Errors are aggregated (never stop at first). Issue codes:

| Code | Meaning |
|------|---------|
| `DATA_PARSE_ERROR` | JSON syntax or envelope structure error |
| `DATA_SCHEMA_INVALID` | Record fails Zod schema validation |
| `DATA_DUPLICATE_ID` | Same ID appears twice in a category |
| `DATA_UNKNOWN_REFERENCE` | Reference points to nonexistent record/category |
| `DATA_INVALID_ID` | ID is empty or not snake_case |
| `DATA_UNSUPPORTED_VERSION` | File version doesn't match category version |
| `DATA_SEMANTIC_ERROR` | Custom semantic validator failure |
