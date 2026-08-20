export const CHARACTER_RIG_ANIMATION_STATES = ["idle", "walk", "attack", "death"] as const;
export type CharacterRigAnimationState = (typeof CHARACTER_RIG_ANIMATION_STATES)[number];

export const CHARACTER_RIG_ANCHORS = [
  "hand_r",
  "hand_l",
  "grip_primary",
  "grip_secondary",
  "weapon_pivot",
  "back",
  "quiver",
  "floating_front",
] as const;
export type CharacterRigAnchorId = (typeof CHARACTER_RIG_ANCHORS)[number];

export const CHARACTER_RIG_HOLDING_PROFILES = [
  "one_hand_melee",
  "two_hand_blade",
  "two_hand_heavy",
  "one_hand_polearm",
  "two_hand_polearm",
  "dual_wield",
  "fist_weapon",
  "bow",
  "crossbow_one_hand",
  "crossbow_two_hand",
  "staff_one_hand",
  "staff_two_hand",
  "floating_focus",
  "levitating_two_hand",
  "transform_body",
] as const;
export type CharacterRigHoldingProfile = (typeof CHARACTER_RIG_HOLDING_PROFILES)[number];

export const CHARACTER_RIG_ATTACK_PROFILES = [
  "slash_1h",
  "slash_2h",
  "heavy_swing",
  "polearm_thrust",
  "dual_slash",
  "fist_combo",
  "bow_shot",
  "crossbow_shot",
  "staff_cast",
  "floating_cast",
  "transform_attack",
] as const;
export type CharacterRigAttackProfile = (typeof CHARACTER_RIG_ATTACK_PROFILES)[number];

export interface CharacterRigPoint {
  readonly x: number;
  readonly y: number;
}

export type CharacterRigFrameAnchors = Readonly<Partial<Record<CharacterRigAnchorId, CharacterRigPoint>>>;

export interface CharacterRigAnimationSource {
  readonly frameCount: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly anchors: readonly CharacterRigFrameAnchors[];
}

export interface CharacterRigLayerSource {
  readonly id: string;
  readonly assetPath: string;
  readonly zIndex: number;
}

export interface CharacterRigWeaponProfile {
  readonly id: string;
  readonly holdingProfile: CharacterRigHoldingProfile;
  readonly attackProfile: CharacterRigAttackProfile;
  readonly layers: readonly CharacterRigLayerSource[];
}

export interface CharacterRigManifest {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly animations: Readonly<Record<CharacterRigAnimationState, CharacterRigAnimationSource>>;
  readonly baseLayers: readonly CharacterRigLayerSource[];
  readonly weapons: Readonly<Record<string, CharacterRigWeaponProfile>>;
}
