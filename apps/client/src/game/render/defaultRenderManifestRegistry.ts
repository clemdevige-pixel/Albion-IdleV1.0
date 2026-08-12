import heroBroadswordManifest from "./manifests/hero-broadsword.render.json";
import heroBowManifest from "./manifests/hero-bow.render.json";
import heroFireStaffManifest from "./manifests/hero-fire-staff.render.json";
import heroSpikedGauntletsManifest from "./manifests/hero-spiked-gauntlets.render.json";
import heroDaggerPairManifest from "./manifests/hero-dagger-pair.render.json";
import stonefangWolfManifest from "./manifests/monster-stonefang-wolf.render.json";
import razorwingHarpyManifest from "./manifests/monster-razorwing-harpy.render.json";
import morganaWitchManifest from "./manifests/monster-morgana-witch.render.json";
import morganaSuppressorManifest from "./manifests/monster-morgana-suppressor.render.json";
import morganaDarkKnightManifest from "./manifests/monster-morgana-dark-knight.render.json";
import morganaHighPriestessManifest from "./manifests/boss-morgana-high-priestess.render.json";
import ancientRuneGolemManifest from "./manifests/boss-ancient-rune-golem.render.json";
import undeadWarriorManifest from "./manifests/monster-undead-warrior.render.json";
import undeadSkeletonSwordsmanManifest from "./manifests/monster-undead-skeleton-swordsman.render.json";
import undeadSkeletonArcherManifest from "./manifests/monster-undead-skeleton-archer.render.json";
import undeadSpectralKnightManifest from "./manifests/monster-undead-spectral-knight.render.json";
import undeadLichManifest from "./manifests/boss-undead-lich.render.json";
import keeperWarriorManifest from "./manifests/monster-keeper-warrior.render.json";
import keeperShamanManifest from "./manifests/monster-keeper-shaman.render.json";
import keeperChampionManifest from "./manifests/monster-keeper-champion.render.json";
import keeperAncientManifest from "./manifests/boss-keeper-ancient.render.json";
import hereticThugManifest from "./manifests/monster-heretic-thug.render.json";
import hereticFirestarterManifest from "./manifests/monster-heretic-firestarter.render.json";
import hereticEnforcerManifest from "./manifests/monster-heretic-enforcer.render.json";
import hereticMadmenManifest from "./manifests/boss-heretic-madmen.render.json";
import woodResourceManifest from "./manifests/resource-wood.render.json";
import oreResourceManifest from "./manifests/resource-ore.render.json";
import hideResourceManifest from "./manifests/resource-hide.render.json";
import fiberResourceManifest from "./manifests/resource-fiber.render.json";
import arrowManifest from "./manifests/projectile-arrow.render.json";
import badonArrowManifest from "./manifests/projectile-badon-arrow.render.json";
import fireballManifest from "./manifests/projectile-fireball.render.json";
import birchForestEnvironment from "./manifests/environment-birch-forest.render.json";
import playerDamageTextManifest from "./manifests/floating-text-player-damage.render.json";
import enemyDamageTextManifest from "./manifests/floating-text-enemy-damage.render.json";
import worldHudManifest from "./manifests/world-hud-default.render.json";
import worldStatusManifest from "./manifests/world-status-default.render.json";
import { RenderManifestRegistry } from "./RenderManifestRegistry";
import {
  parseActorRenderManifest,
  parseEnvironmentRenderManifest,
  parseFloatingTextRenderManifest,
  parseProjectileRenderManifest,
  parseResourceNodeRenderManifest,
  parseStaticActorRenderManifest,
  parseWorldHudRenderManifest,
  parseWorldStatusRenderManifest,
} from "./RenderManifestParsing";

export const renderManifestRegistry = new RenderManifestRegistry();
renderManifestRegistry.registerActor(parseActorRenderManifest(heroBroadswordManifest));
renderManifestRegistry.registerActor(parseActorRenderManifest(heroBowManifest));
renderManifestRegistry.registerActor(parseActorRenderManifest(heroFireStaffManifest));
renderManifestRegistry.registerActor(parseActorRenderManifest(heroSpikedGauntletsManifest));
const heroDaggerPair = renderManifestRegistry.registerActor(parseActorRenderManifest(heroDaggerPairManifest));
Object.assign(heroDaggerPair.poses.death, {
  frameWidth: heroDaggerPairManifest.poses.death.frameWidth,
  frameHeight: heroDaggerPairManifest.poses.death.frameHeight,
  startFrame: heroDaggerPairManifest.poses.death.startFrame,
  endFrame: heroDaggerPairManifest.poses.death.endFrame,
  frameRate: heroDaggerPairManifest.poses.death.frameRate,
  repeat: heroDaggerPairManifest.poses.death.repeat,
});
renderManifestRegistry.setDefaultActor(heroBroadswordManifest.id);
renderManifestRegistry.registerStaticActor(parseStaticActorRenderManifest(stonefangWolfManifest));
renderManifestRegistry.registerStaticActor(parseStaticActorRenderManifest(razorwingHarpyManifest));
renderManifestRegistry.registerStaticActor(parseStaticActorRenderManifest(morganaWitchManifest));
renderManifestRegistry.registerStaticActor(parseStaticActorRenderManifest(morganaSuppressorManifest));
renderManifestRegistry.registerStaticActor(parseStaticActorRenderManifest(morganaDarkKnightManifest));
renderManifestRegistry.registerStaticActor(parseStaticActorRenderManifest(morganaHighPriestessManifest));
renderManifestRegistry.registerStaticActor(parseStaticActorRenderManifest(ancientRuneGolemManifest));
renderManifestRegistry.registerStaticActor(parseStaticActorRenderManifest(undeadWarriorManifest));
renderManifestRegistry.registerStaticActor(parseStaticActorRenderManifest(undeadSkeletonSwordsmanManifest));
renderManifestRegistry.registerStaticActor(parseStaticActorRenderManifest(undeadSkeletonArcherManifest));
renderManifestRegistry.registerStaticActor(parseStaticActorRenderManifest(undeadSpectralKnightManifest));
renderManifestRegistry.registerStaticActor(parseStaticActorRenderManifest(undeadLichManifest));
renderManifestRegistry.registerStaticActor(parseStaticActorRenderManifest(keeperWarriorManifest));
renderManifestRegistry.registerStaticActor(parseStaticActorRenderManifest(keeperShamanManifest));
renderManifestRegistry.registerStaticActor(parseStaticActorRenderManifest(keeperChampionManifest));
renderManifestRegistry.registerStaticActor(parseStaticActorRenderManifest(keeperAncientManifest));
renderManifestRegistry.registerStaticActor(parseStaticActorRenderManifest(hereticThugManifest));
renderManifestRegistry.registerStaticActor(parseStaticActorRenderManifest(hereticFirestarterManifest));
renderManifestRegistry.registerStaticActor(parseStaticActorRenderManifest(hereticEnforcerManifest));
renderManifestRegistry.registerStaticActor(parseStaticActorRenderManifest(hereticMadmenManifest));
renderManifestRegistry.setDefaultStaticActor(undeadWarriorManifest.id);
renderManifestRegistry.registerResourceNode(parseResourceNodeRenderManifest(woodResourceManifest));
renderManifestRegistry.registerResourceNode(parseResourceNodeRenderManifest(oreResourceManifest));
renderManifestRegistry.registerResourceNode(parseResourceNodeRenderManifest(hideResourceManifest));
renderManifestRegistry.registerResourceNode(parseResourceNodeRenderManifest(fiberResourceManifest));
renderManifestRegistry.registerProjectile(parseProjectileRenderManifest(arrowManifest));
renderManifestRegistry.registerProjectile(parseProjectileRenderManifest(badonArrowManifest));
renderManifestRegistry.registerProjectile(parseProjectileRenderManifest(fireballManifest));
renderManifestRegistry.registerEnvironment(parseEnvironmentRenderManifest(birchForestEnvironment));
renderManifestRegistry.setDefaultEnvironment(birchForestEnvironment.id);
renderManifestRegistry.registerFloatingText(parseFloatingTextRenderManifest(playerDamageTextManifest));
renderManifestRegistry.registerFloatingText(parseFloatingTextRenderManifest(enemyDamageTextManifest));
renderManifestRegistry.setDefaultFloatingText("player", playerDamageTextManifest.id);
renderManifestRegistry.setDefaultFloatingText("enemy", enemyDamageTextManifest.id);
renderManifestRegistry.registerWorldHud(parseWorldHudRenderManifest(worldHudManifest));
renderManifestRegistry.setDefaultWorldHud(worldHudManifest.id);
renderManifestRegistry.registerWorldStatus(parseWorldStatusRenderManifest(worldStatusManifest));
renderManifestRegistry.setDefaultWorldStatus(worldStatusManifest.id);
