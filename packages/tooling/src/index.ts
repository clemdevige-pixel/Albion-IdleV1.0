export { findRepoRoot } from "./repo-root.js";
export {
  validateData,
  CONTENT_MANIFEST_RELATIVE,
  type DataValidationSummary,
} from "./validate-data.js";
export {
  validateAssets,
  ASSET_MANIFEST_RELATIVE,
  type AssetValidationSummary,
} from "./validate-assets.js";
export {
  CHARACTER_RIG_ANIMATION_STATES,
  CHARACTER_RIG_ANCHORS,
  CHARACTER_RIG_HOLDING_PROFILES,
  CHARACTER_RIG_ATTACK_PROFILES,
  type CharacterRigAnimationState,
  type CharacterRigAnchorId,
  type CharacterRigHoldingProfile,
  type CharacterRigAttackProfile,
  type CharacterRigPoint,
  type CharacterRigFrameAnchors,
  type CharacterRigAnimationSource,
  type CharacterRigLayerSource,
  type CharacterRigWeaponProfile,
  type CharacterRigManifest,
} from "./character-rig/CharacterRigManifest.js";
export {
  CharacterRigValidationError,
  validateCharacterRigManifest,
} from "./character-rig/CharacterRigValidation.js";
