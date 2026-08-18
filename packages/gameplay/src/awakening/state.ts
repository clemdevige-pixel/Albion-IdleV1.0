import type { ItemInstanceId } from "../inventory/types.js";
import type { AwakenedWeaponState, AwakenedWeaponTier } from "./types.js";

export function createFreshAwakenedWeaponState(
  itemInstanceId: ItemInstanceId,
  tier: AwakenedWeaponTier,
): AwakenedWeaponState {
  return {
    itemInstanceId,
    tier,
    awakened: false,
    storedAttunement: 0,
    lifetimeAttunementInvested: 0,
    strain: 0,
    traits: [],
  };
}

export function resetAwakenedWeaponState(
  state: Pick<AwakenedWeaponState, "itemInstanceId" | "tier">,
): AwakenedWeaponState {
  return createFreshAwakenedWeaponState(state.itemInstanceId, state.tier);
}
