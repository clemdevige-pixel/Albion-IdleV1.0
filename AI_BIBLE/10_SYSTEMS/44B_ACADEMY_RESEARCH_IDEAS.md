# 44B_ACADEMY_RESEARCH_IDEAS

Status: DESIGN BACKLOG / PARTIALLY VALIDATED
Authority: idea backlog for future Academy expansion
Last update: 2026-08-21

---

# PURPOSE

This document records candidate Academy Research ideas beyond the already validated faction / Cartography / Archaeology loop.

These entries are NOT automatically implementation requirements.

Rule of ownership:

> Research should unlock a new function, control surface or capability.
> Mastery should improve the performance/yield of something already available.

Avoid generic Research bonuses such as `+X% damage`, `+X% craft speed` or `+X% worker yield` unless separately justified by future design.

---

# 1. VALIDATED CANDIDATE — DOCTRINE D'EQUIPEMENT

Status: VALIDATED DESIGN DIRECTION

Purpose:

- unlock equipment presets;
- reduce friction when switching between open-world farming, progression and faction dungeons;
- support future build specialization without adding direct power.

Candidate V1 behavior:

- unlock 3 equipment presets;
- each preset stores references to the player's real equipped items;
- no item duplication;
- no stat bonus;
- one-click equip if referenced items are still available under the inventory/equipment rules.

A preset may include:

- weapon;
- off-hand where applicable;
- head;
- torso;
- boots;
- cape;
- consumable/potion.

Examples:

- Farm monde;
- Progression;
- Donjon Keeper.

Final UX, tier, Research cost and duration remain OPEN until implementation.

---

# 2. STRONG CANDIDATE — TACTIQUES DE COMBAT

Status: IDEA / PROMISING / NOT YET VALIDATED

Purpose:

- give the player more strategic control over automated combat;
- reuse the existing deterministic AI/ability-priority architecture;
- preserve the game's preparation-over-execution identity.

Candidate behavior:

- unlock player-authored priority ordering for the 3 active abilities;
- example: Priority 1 -> Priority 2 -> Priority 3;
- AI remains responsible for actual legal execution according to cooldowns and combat rules;
- no manual combat execution is introduced.

Guardrails:

- no scripting language in V1;
- no arbitrary conditions until separately designed;
- no bypass of Ability System legality/cooldowns;
- must remain deterministic and data-driven.

Final scope remains OPEN.

---

# 3. CANDIDATE — PROTOCOLES DE COMBAT AVANCES

Status: IDEA / NOT VALIDATED

Potentially extends Tactiques de combat rather than existing as an independent system.

Candidate behavior:

- save multiple combat-priority profiles;
- examples: Farm / Progression / Boss-Donjon;
- each profile stores ability priorities only;
- may later integrate with equipment presets if there is a clear UX need.

Do NOT implement this as a duplicate of equipment presets.

It is only justified if combat-priority configuration itself becomes deep enough to warrant multiple saved profiles.

---

# 4. STRONG CANDIDATE — CONSIGNES D'EXPLORATION

Status: IDEA / PROMISING / NOT YET VALIDATED

Purpose:

- give the player configurable safety/automation rules for the existing Farm/Progression loop;
- improve idle control without adding power.

Candidate examples:

- after X deaths on the current progression target -> switch back to Farm;
- after X failed attempts -> return to the last sustainable farming point;
- if healing consumable availability reaches zero -> stop Progression or switch to Farm.

Guardrails:

- conditions must use existing authoritative game state;
- avoid creating a general-purpose scripting engine;
- rules should remain a small authored set of deterministic conditions/actions;
- no offline combat simulation is introduced by this Research.

Exact conditions/actions remain OPEN.

---

# 5. CANDIDATE — ANALYSE TACTIQUE

Status: IDEA / INTERESTING BUT PRESENTATION UNSOLVED

Purpose:

- unlock deeper combat information in the existing Bestiary/Codex;
- support preparation before difficult content.

Potential information:

- HP;
- Armor;
- Magic Resistance;
- physical/magical damage profile;
- abilities;
- control effects;
- boss ability descriptions.

Known issue:

The same monster definition may appear in multiple world contexts at different effective difficulties.

Therefore a single static stat block attached to the monster can be misleading.

If retained, the UI must resolve combat information by encounter/context/difficulty rather than pretending the creature has one universal stat line.

The exact presentation model is NOT validated yet.

---

# 6. VALIDATED DIRECTION — WORKER ORGANISATION / MULTIPLE WORKERS

Status: VALIDATED DESIGN DIRECTION, NUMBERS OPEN

Current worker constraints remain authoritative:

- workers are permanent;
- each worker has one permanent gathering profession;
- workers support passive production;
- the Hero remains the best active gatherer.

Research opportunity:

- increase the number of workers that may operate simultaneously;
- permit limited additional workers in the same profession over progression;
- never allow uncapped stacking such as 10-15 workers on one resource family.

Required structure:

1. GLOBAL ACTIVE-WORKER CAP
   - limits total simultaneous worker assignments across all professions.

2. PER-PROFESSION CAP
   - limits how many workers of the same gathering profession may exist/be active according to the final Worker contract.

Candidate progression shape only:

- baseline: 1 worker max per profession;
- Research I: +1 global active-worker slot;
- later Research: selected/all profession caps may reach 2;
- later Research: another +1 global active-worker slot.

Exact numbers, tiers, recruitment interaction and worker-economy balance MUST be audited at implementation time.

Research should unlock capacity, NOT provide a generic worker-yield percentage bonus.

---

# 7. DEFERRED — FABRICATION SPECIALISEE

Status: DEFERRED / DO NOT IMPLEMENT YET

Idea:

- consume more of the existing recipe materials to improve the distribution of item Quality.

Reason for deferral:

- item Quality exists in architecture/documentation but is not currently an active gameplay layer to build Academy progression around.

Revisit only when Quality is actually integrated and balanced in live gameplay.

---

# 8. DEFERRED — DONJON PREPARATIONS

Status: DEFERRED / FUTURE DUNGEON DIFFICULTY SYSTEM

Idea:

- unlock pre-run preparation items/choices consumed for one dungeon run.

Potential examples previously discussed:

- repair support;
- healing-oriented preparation;
- specific resistance/utility preparation.

Reason for deferral:

- current dungeon design does not need another preparation layer;
- faction Capes, equipment and consumables already provide preparation decisions;
- adding this now risks mandatory buff stacking.

Revisit when additional dungeon difficulties, challenge modes or modifiers are introduced.

---

# 9. REJECTED / LOW-VALUE IDEAS

## Equipment dismantling / material recovery

Rejected as an Academy pillar because lower-tier equipment is not inherently obsolete in Albion Idle; it remains playable at its associated difficulty/content.

## Enchantment recycling as primary progression

Not justified as a core Academy feature for the same reason. May only be revisited if the economy creates a concrete need later.

## Production batch planning for multiple identical items

Rejected for current gameplay because there is no meaningful need to mass-craft multiple copies of the same equipment item.

## Advanced Armory as separate Research

Rejected because the proposed functionality substantially duplicated Equipment Presets.

---

# 10. CURRENT SHORTLIST

Best current Academy expansion candidates beyond factions:

1. Doctrine d'equipement — VALIDATED DIRECTION
2. Worker Organisation / Multiple Workers — VALIDATED DIRECTION, balance open
3. Tactiques de combat — STRONG CANDIDATE
4. Consignes d'exploration — STRONG CANDIDATE
5. Analyse tactique — CANDIDATE, presentation unresolved
6. Protocoles de combat avances — CONDITIONAL extension only

Deferred:

- Fabrication specialisee -> wait for active Quality gameplay;
- Dungeon Preparations -> wait for higher dungeon difficulties/challenge modes.

The Academy should not be filled with artificial Research entries merely to create volume. Fewer high-impact functional unlocks are preferred.

DOCUMENT TERMINE
