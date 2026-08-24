# 32A. ITEM INVENTORY ICON PIPELINE

This document is the authoritative sub-contract of `32_DATA_CONTENT_ASSET_PIPELINE.txt` for every visual asset displayed as an inventory item.

It applies to weapons, equipment, capes, consumables, resources, fragments, keys, special items and any future inventory family.

---

# 1. Core Contract

The canonical workflow is:

```text
MASTER PNG
↓
apps/client/assets/items/masters/<family>/...
↓
pnpm.cmd generate:item-icons
↓
apps/client/public/assets/items/icons/<family>/...
↓
runtime UI
```

The master is the source of truth.

The generated icon is a derived, versioned runtime asset.

Never edit a generated inventory icon manually.

If a generated icon is wrong, fix either:

- the master source, or
- the shared generator.

Do not add per-item CSS, per-item resize values or per-item image exceptions to compensate for a bad generated icon.

---

# 2. Canonical Master Location

All inventory masters belong under:

```text
apps/client/assets/items/masters/
```

Recommended families:

```text
armes/
equipements/
consommables/
ressources/
speciaux/
```

These names are organizational conventions only.

The generator is recursive and category-agnostic. It must not contain a hardcoded list of item families.

Any PNG placed anywhere under `masters/` is eligible for generation.

Example:

```text
apps/client/assets/items/masters/ressources/enchantment-shard.png
```

produces:

```text
apps/client/public/assets/items/icons/ressources/enchantment-shard.png
```

Nested folders are preserved identically.

---

# 3. Master Requirements

A master must be:

- PNG
- transparent alpha background
- the clean source artwork
- not an already generated 128x128 derivative
- not manually padded for the inventory UI

Do not pre-center or pre-resize masters solely for the inventory.

The generator owns framing normalization.

---

# 4. Generator

The canonical command is:

```powershell
pnpm.cmd generate:item-icons
```

On environments where `pnpm` works directly, the equivalent is:

```bash
pnpm generate:item-icons
```

The current implementation lives at:

```text
packages/tooling/src/bin/generate-item-icons.ts
```

The generator recursively scans:

```text
apps/client/assets/items/masters/
```

and reproduces the same relative structure under:

```text
apps/client/public/assets/items/icons/
```

---

# 5. Shared Framing Rule

The generator owns the common inventory framing rule.

Current contract:

- transparent margins are trimmed
- aspect ratio is preserved
- pixel-art resizing uses nearest-neighbour scaling
- visual mass is normalized through the shared algorithm
- visible pixels are centered automatically
- final canvas is 128x128 transparent PNG
- source artwork is not cropped

There must be one generic framing algorithm for inventory assets.

Do not create item-specific scale profiles unless a future project-wide rule explicitly requires them.

---

# 6. Runtime Rule

Runtime components consume generated icons only.

The runtime must not:

- resize individual item families with bespoke constants
- contain item-name checks
- inspect master files
- scan the masters directory
- regenerate images in the browser

`ItemVisual` and equivalent UI components remain generic.

Item/content presentation data points to the generated runtime icon path through the existing presentation/catalog system.

Do not hardcode new item paths directly inside React components.

---

# 7. Generated Outputs Are Versioned

Generated icons are committed to Git.

This is intentional.

They are build-time authored derivatives used directly by the client and must be reproducible from the committed masters.

After running the generator locally, the developer who ran it is responsible for committing and pushing the generated files.

ChatGPT/remote agents do not automatically receive files generated on the developer's local machine.

Therefore the local workflow explicitly includes the push step.

---

# 8. Required Local Workflow

For a new or replaced inventory asset:

1. Pull the active branch.
2. Deposit the clean master under `apps/client/assets/items/masters/<family>/`.
3. Run the generator.
4. Validate the visual result in game.
5. Run minimum automated checks.
6. Commit both master changes and generated icon changes.
7. Push the active branch.

Windows commands from repository root:

```powershell
git pull origin agent/albion-idle-development
pnpm.cmd generate:item-icons
pnpm.cmd --filter client typecheck
pnpm.cmd --filter client test
```

Then:

```powershell
git add apps/client/assets/items/masters/
git add apps/client/public/assets/items/icons/
git commit -m "chore: regenerate item icons"
git push origin agent/albion-idle-development
```

The commit message may be more specific when appropriate.

---

# 9. What Must Be Pushed

When a master was added or changed, push:

```text
apps/client/assets/items/masters/...
```

and the corresponding generated outputs:

```text
apps/client/public/assets/items/icons/...
```

If only the shared generator changes, regenerate all canonical masters and commit every resulting output difference.

Do not commit only the generator while leaving stale generated outputs in the repository.

---

# 10. Visual Validation

Minimum manual checks for an inventory asset:

- inventory
- bank
- character/equipment presentation when applicable
- crafting/recipe UI when applicable
- any tooltip or item preview that uses the shared item visual

Verify:

- no distortion
- no clipping
- reasonable visual scale versus neighboring items
- coherent centering
- readable pixel art

A small visual variation between silhouettes is acceptable. The goal is coherent presentation, not mathematically identical perceived area.

---

# 11. Regression Policy

If several assets exhibit the same framing problem, improve the generic generator.

If only one master is malformed, fix that master.

Do not solve a source-art problem with runtime CSS.

Do not solve a generic-generator problem with individual exceptions.

Do not repeatedly process an already generated icon as a new source.

Always regenerate from the canonical master.

---

# 12. Legacy Assets

`apps/client/public/assets/items/` may still contain legacy source/runtime assets during migration.

These files must not be assumed removable solely because a generated icon exists.

Before deleting a legacy asset:

- audit all code/data references
- verify it is not used by combat, crafting, UI, manifests or other runtime systems
- delete only when no remaining reference exists

The generator may temporarily support legacy fallback behavior during migration, but new assets must use the canonical `masters/` pipeline.

---

# 13. Future Item Families

No generator change is required to add a new family.

Example:

```text
apps/client/assets/items/masters/reliques/my-relic.png
```

must automatically produce:

```text
apps/client/public/assets/items/icons/reliques/my-relic.png
```

The folder structure is data organization, not generator logic.

---

# 14. Agent Rules

Any future agent working on inventory assets must:

- inspect this document before changing the pipeline
- reuse `generate-item-icons.ts`
- preserve the recursive category-agnostic architecture
- never introduce a parallel icon pipeline
- never manually normalize generated PNGs as the permanent solution
- never add per-item runtime presentation hacks without explicit architectural approval
- tell the developer when a local `generate:item-icons` run is required
- explicitly remind the developer that locally generated PNGs must be committed and pushed

If the master exists only on the developer's machine, the agent cannot pretend the generated output has been pushed.

---

# 15. Acceptance Criteria

The inventory icon pipeline is healthy when:

- one canonical master exists for each migrated item visual
- one command regenerates every inventory icon
- all folders under `masters/` are discovered recursively
- output paths mirror master paths
- generated PNGs are reproducible
- runtime presentation is generic
- no item-specific scaling hacks are required
- masters and outputs are both versioned
- future item families require no generator code change

---

# 16. Summary

```text
Create clean master
↓
Deposit under masters/<family>/
↓
Run pnpm.cmd generate:item-icons locally
↓
Validate inventory presentation
↓
Run typecheck + tests
↓
Commit masters + generated icons
↓
Push branch
```

This is the mandatory inventory asset integration workflow for Albion Idle.
