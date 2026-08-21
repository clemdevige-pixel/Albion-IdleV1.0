import { HERO_RENDER_MANIFESTS } from "./HeroRenderCatalog";
import { RenderManifestRegistry } from "./RenderManifestRegistry";
import { parseRenderManifest } from "./RenderManifestParsing";

const rawManifestModules = import.meta.glob(
  "./manifests/*.render.json",
  {
    eager: true,
    import: "default",
  },
);

export const renderManifestRegistry = new RenderManifestRegistry();

for (const rawManifest of Object.values(rawManifestModules)) {
  const manifest = parseRenderManifest(rawManifest);

  switch (manifest.kind) {
    case "actor":
      renderManifestRegistry.registerActor(manifest);
      break;

    case "static_actor":
      renderManifestRegistry.registerStaticActor(manifest);
      break;

    case "resource_node":
      renderManifestRegistry.registerResourceNode(manifest);
      break;

    case "projectile":
      renderManifestRegistry.registerProjectile(manifest);
      break;

    case "environment":
      renderManifestRegistry.registerEnvironment(manifest);
      break;

    case "floating_text":
      renderManifestRegistry.registerFloatingText(manifest);
      break;

    case "world_hud":
      renderManifestRegistry.registerWorldHud(manifest);
      break;

    case "world_status":
      renderManifestRegistry.registerWorldStatus(manifest);
      break;
  }
}

for (const heroManifest of HERO_RENDER_MANIFESTS) {
  renderManifestRegistry.registerActor(heroManifest);
}

renderManifestRegistry.setDefaultActor("hero_broadsword");
renderManifestRegistry.setDefaultStaticActor("monster_undead_warrior");
renderManifestRegistry.setDefaultEnvironment("birch_forest");

renderManifestRegistry.setDefaultFloatingText(
  "player",
  "player_damage",
);

renderManifestRegistry.setDefaultFloatingText(
  "enemy",
  "enemy_damage",
);

renderManifestRegistry.setDefaultWorldHud("world_hud_default");
renderManifestRegistry.setDefaultWorldStatus("world_status_default");
