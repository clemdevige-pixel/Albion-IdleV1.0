# Item icon masters

This directory is the canonical source for inventory item art. Store original PNG masters here, never pre-resized UI derivatives.

Authoritative project contract:

`AI_BIBLE/30_TECHNICAL/32A_ITEM_INVENTORY_ICON_PIPELINE.md`

Recommended organization:

- `armes/`
- `equipements/`
- `consommables/`
- `ressources/`
- `speciaux/`

The generator is recursive and category-agnostic: any PNG placed anywhere under `masters/` is processed and the same relative path is reproduced under `apps/client/public/assets/items/icons/`.

Example:

`apps/client/assets/items/masters/ressources/enchantment-shard.png`
becomes
`apps/client/public/assets/items/icons/ressources/enchantment-shard.png`

Run from the repository root:

```bash
pnpm generate:item-icons
```

On Windows PowerShell where pnpm.ps1 is blocked, use:

```powershell
pnpm.cmd generate:item-icons
```

The generator trims transparent margins, preserves aspect ratio, applies the shared inventory framing rule, and writes centered 128x128 PNG icons. Generated icons are versioned outputs: do not edit them by hand. If a result is wrong, fix the master or the generator.

After local generation, commit and push both the canonical masters and the generated runtime icons. Remote agents do not automatically receive files generated on the developer's local machine.
