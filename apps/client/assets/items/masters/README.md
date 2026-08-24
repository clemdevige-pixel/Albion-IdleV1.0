# Item icon masters

Drop original PNG masters here, never pre-resized UI derivatives.

- Weapons: `armes/`
- Equipment/capes: `equipements/`

Then run from the repository root:

```bash
pnpm generate:item-icons
```

The generator trims transparent margins and writes centered 128x128 PNG icons to `apps/client/public/assets/items/icons/<category>/` using one uniform rule. Do not edit generated icons by hand.
