# 44B_ACADEMY_RESEARCH_IDEAS

Status: DESIGN BACKLOG / PARTIALLY VALIDATED
Authority: idea backlog for future Academy expansion
Last update: 2026-08-22

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

# 6. VALIDATED / IMPLEMENTED — ORGANISATION AVANCEE DES OUVRIERS

Status: VALIDATED CONTRACT / IMPLEMENTED

## 6.1 Baseline worker contract

Before this Research, the Player Island supports exactly:

- 4 workers maximum;
- 1 Woodcutter;
- 1 Miner;
- 1 Skinner;
- 1 Fiber Harvester;
- all four workers may operate simultaneously;
- each worker has a permanent gathering profession;
- each worker owns independent mastery, assigned production tier and production session.

The Research MUST NOT nerf or remove this baseline capacity.

## 6.2 Research contract

Research:

- id: `research_worker_organization`;
- display name: `Organisation avancée des ouvriers`;
- Academy tier: T6;
- cost: 60,000 Silver;
- material cost: none;
- duration: 2h30;
- unlock id: `workers:advanced_organization`.

Completion immediately changes the worker roster policy to:

- 8 workers maximum;
- 2 workers maximum per gathering profession;
- all workers may operate simultaneously;
- recruitment cost after the Research: 5,000 Silver per worker.

The expected fully expanded roster is therefore:

- 2 Woodcutters;
- 2 Miners;
- 2 Skinners;
- 2 Fiber Harvesters.

## 6.3 Progression reason

This unlock is intentionally placed at T6 rather than T7.

Newly recruited workers start with their own mastery at level 0 and therefore begin on T3 gathering content. They remain subject to the normal worker gathering mastery gates:

- T3 -> mastery 0;
- T4 -> mastery 3;
- T5 -> mastery 7;
- T6 -> mastery 11;
- T7 -> mastery 18;
- T8 -> mastery 25.

Giving access at T6 gives the second generation of workers time to progress before the largest T7/T8 resource requirements.

## 6.4 Architecture rules

The implementation is WorkerId-first:

- profession is a worker property, not worker identity;
- multiple workers of one profession must coexist independently;
- mastery, tier, session, pause/resume and save state remain per WorkerId;
- the ResearchService unlock is the authority for advanced roster capacity;
- no duplicated boolean or worker-specific Research branch may become a second authority;
- UI must expose each worker independently inside its gathering building.

Research unlocks capacity only. It does NOT grant generic worker yield/speed bonuses.

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

Current Academy expansion state beyond factions:

1. Organisation avancée des ouvriers — VALIDATED / IMPLEMENTED at T6
2. Doctrine d'equipement — VALIDATED DIRECTION
3. Tactiques de combat — STRONG CANDIDATE
4. Consignes d'exploration — STRONG CANDIDATE
5. Analyse tactique — CANDIDATE, presentation unresolved
6. Protocoles de combat avances — CONDITIONAL extension only

Deferred:

- Fabrication specialisee -> wait for active Quality gameplay;
- Dungeon Preparations -> wait for higher dungeon difficulties/challenge modes.

The Academy should not be filled with artificial Research entries merely to create volume. Fewer high-impact functional unlocks are preferred.

DOCUMENT TERMINE
