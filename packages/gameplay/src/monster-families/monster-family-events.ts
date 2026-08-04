import type { MonsterFamilyId } from "./types.js";

// ---------------------------------------------------------------------------
// Event payloads
// ---------------------------------------------------------------------------

export interface MonsterFamilyRegisteredEvent {
  readonly familyId: MonsterFamilyId;
  readonly name: string;
  readonly faction: string;
}

export interface MonsterFamilyUnregisteredEvent {
  readonly familyId: MonsterFamilyId;
}

// ---------------------------------------------------------------------------
// Event map
// ---------------------------------------------------------------------------

export interface MonsterFamilyEventMap {
  monsterFamilyRegistered: MonsterFamilyRegisteredEvent;
  monsterFamilyUnregistered: MonsterFamilyUnregisteredEvent;
}
