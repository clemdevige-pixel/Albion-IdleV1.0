import {
  CHARACTER_RIG_ANIMATION_STATES,
  type CharacterRigManifest,
} from "./CharacterRigManifest.js";

export class CharacterRigValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Character rig manifest invalide:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
    this.name = "CharacterRigValidationError";
    this.issues = issues;
  }
}

export function validateCharacterRigManifest(manifest: CharacterRigManifest): void {
  const issues: string[] = [];

  if (manifest.schemaVersion !== 1) issues.push(`schemaVersion non supportée: ${manifest.schemaVersion}`);
  if (manifest.id.trim().length === 0) issues.push("id manquant");
  if (!Number.isInteger(manifest.frameWidth) || manifest.frameWidth <= 0) issues.push("frameWidth doit être un entier positif");
  if (!Number.isInteger(manifest.frameHeight) || manifest.frameHeight <= 0) issues.push("frameHeight doit être un entier positif");

  for (const state of CHARACTER_RIG_ANIMATION_STATES) {
    const animation = manifest.animations[state];
    if (animation.frameWidth !== manifest.frameWidth || animation.frameHeight !== manifest.frameHeight) {
      issues.push(`${state}: dimensions de frame différentes du rig maître`);
    }
    if (!Number.isInteger(animation.frameCount) || animation.frameCount <= 0) {
      issues.push(`${state}: frameCount doit être un entier positif`);
    }
    if (animation.anchors.length !== animation.frameCount) {
      issues.push(`${state}: anchors (${animation.anchors.length}) doit contenir exactement une entrée par frame (${animation.frameCount})`);
    }

    animation.anchors.forEach((anchors, frameIndex) => {
      for (const [anchorId, point] of Object.entries(anchors)) {
        if (point === undefined) continue;
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
          issues.push(`${state}[${frameIndex}].${anchorId}: coordonnées invalides`);
          continue;
        }
        if (point.x < 0 || point.x > manifest.frameWidth || point.y < 0 || point.y > manifest.frameHeight) {
          issues.push(`${state}[${frameIndex}].${anchorId}: anchor hors du canvas maître`);
        }
      }
    });
  }

  const layerIds = new Set<string>();
  for (const layer of manifest.baseLayers) {
    if (layerIds.has(layer.id)) issues.push(`baseLayers: id dupliqué ${layer.id}`);
    layerIds.add(layer.id);
    if (layer.assetPath.trim().length === 0) issues.push(`baseLayers.${layer.id}: assetPath manquant`);
    if (!Number.isFinite(layer.zIndex)) issues.push(`baseLayers.${layer.id}: zIndex invalide`);
  }

  for (const [weaponKey, weapon] of Object.entries(manifest.weapons)) {
    if (weapon.id !== weaponKey) issues.push(`weapons.${weaponKey}: id interne ${weapon.id} différent de la clé`);
    const weaponLayerIds = new Set<string>();
    for (const layer of weapon.layers) {
      if (weaponLayerIds.has(layer.id)) issues.push(`weapons.${weaponKey}: layer id dupliqué ${layer.id}`);
      weaponLayerIds.add(layer.id);
      if (layer.assetPath.trim().length === 0) issues.push(`weapons.${weaponKey}.${layer.id}: assetPath manquant`);
      if (!Number.isFinite(layer.zIndex)) issues.push(`weapons.${weaponKey}.${layer.id}: zIndex invalide`);
    }
  }

  if (issues.length > 0) throw new CharacterRigValidationError(issues);
}
