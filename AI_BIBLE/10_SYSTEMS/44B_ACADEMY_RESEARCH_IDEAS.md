# 44B_ACADEMY_RESEARCH_IDEAS

Status: DESIGN BACKLOG / PARTIALLY VALIDATED
Authority: idea backlog for future Academy expansion
Last update: 2026-08-24

---

# PURPOSE

This document records candidate Academy Research ideas beyond the already validated faction / Cartography / Archaeology loop.

These entries are NOT automatically implementation requirements.

Rule of ownership:

> Research should unlock a new function, control surface or capability.
> Mastery should improve the performance/yield of something already available.

Avoid generic Research bonuses such as `+X% damage`, `+X% craft speed` or `+X% worker yield` unless separately justified by future design.

---

# 1. ABANDONED — DOCTRINE D'EQUIPEMENT

Status: ABANDONED / DO NOT IMPLEMENT AS ACADEMY RESEARCH

Equipment loadouts/presets are part of the baseline Character equipment UX and must remain available independently of Academy progression.

The former proposal to gate equipment presets behind Research was explicitly abandoned.

Do not:

- create a Doctrine d'equipement Research;
- hide existing loadout controls behind an Academy unlock;
- add a Research prerequisite to save/apply/rename/delete equipment loadouts.

---

# 2. STRONG CANDIDATE — CONSIGNES D'EXPLORATION

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

# 3. CANDIDATE — ANALYSE TACTIQUE

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

# 4. VALIDATED / IMPLEMENTED — ORGANISATION AVANCEE DES OUVRIERS

Status: VALIDATED CONTRACT / IMPLEMENTED

## 4.1 Baseline worker contract

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

## 4.2 Research contract

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

## 4.3 Progression reason

This unlock is intentionally placed at T6 rather than T7.

Newly recruited workers start with their own mastery at level 0 and therefore begin on T3 gathering content. They remain subject to the normal worker gathering mastery gates:

- T3 -> mastery 0;
- T4 -> mastery 3;
- T5 -> mastery 7;
- T6 -> mastery 11;
- T7 -> mastery 18;
- T8 -> mastery 25.

Giving access at T6 gives the second generation of workers time to progress before the largest T7/T8 resource requirements.

## 4.4 Architecture rules

The implementation is WorkerId-first:

- profession is a worker property, not worker identity;
- multiple workers of one profession must coexist independently;
- mastery, tier, session, pause/resume and save state remain per WorkerId;
- the ResearchService unlock is the authority for advanced roster capacity;
- no duplicated boolean or worker-specific Research branch may become a second authority;
- UI must expose each worker independently inside its gathering building.

Research unlocks capacity only. It does NOT grant generic worker yield/speed bonuses.

---

# 5. VALIDATED / IMPLEMENTED — PROCEDES DE RAFFINAGE AVANCES

Status: VALIDATED CONTRACT / IMPLEMENTED

## 5.1 Research contract

Research:

- id: `research_instant_refining`;
- display name: `Procédés de raffinage avancés`;
- Academy tier: T7;
- cost: 80,000 Silver;
- material cost: none;
- duration: 3h;
- unlock id: `refining:instant_batch`.

## 5.2 Gameplay effect

Before this Research, refining uses the normal timed automatic cycle system.

After completion, each refining building exposes instant batch refining for the selected family/tier:

- one action converts every currently payable cycle for that recipe;
- no timed refining session is started for that batch;
- input requirements remain exactly those of the authored recipe;
- Tn recipes still consume the authored Tn-1 refined prerequisite;
- output quantity and yield remain unchanged;
- no bonus resource, speed multiplier or altered refining ratio is granted.

Example:

- 80 T7 raw ore + 40 T6 refined bars;
- T7 recipe requires 2 raw ore + 1 T6 refined bar per cycle;
- instant batch executes 40 cycles;
- result is exactly 40 T7 refined bars.

## 5.3 Architecture rules

- `ResearchService` unlock state is the authority for availability;
- recipe definitions remain the authority for costs and outputs;
- do NOT implement the unlock by authoring `durationTicks = 0` variants;
- do NOT duplicate refining recipes or create a second refining economy;
- instant conversion must consume the maximum payable batch atomically;
- if output cannot be stored atomically, inputs must not be lost;
- the original timed refining path remains unchanged while the Research is locked.

The purpose is late-game QoL only. It removes repetitive waiting after the player has already mastered the production loop; it does not increase economic efficiency.

---

# 6. DEFERRED — FABRICATION SPECIALISEE

Status: DEFERRED / DO NOT IMPLEMENT YET

Idea:

- consume more of the existing recipe materials to improve the distribution of item Quality.

Reason for deferral:

- item Quality exists in architecture/documentation but is not currently an active gameplay layer to build Academy progression around.

Revisit only when Quality is actually integrated and balanced in live gameplay.

---

# 7. DEFERRED — DONJON PREPARATIONS

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

# 8. REJECTED / LOW-VALUE IDEAS

## Equipment dismantling / material recovery

Rejected as an Academy pillar because lower-tier equipment is not inherently obsolete in Albion Idle; it remains playable at its associated difficulty/content.

## Enchantment recycling as primary progression

Not justified as a core Academy feature for the same reason. May only be revisited if the economy creates a concrete need later.

## Production batch planning for multiple identical items

Rejected for current gameplay because there is no meaningful need to mass-craft multiple copies of the same equipment item.

## Advanced Armory as separate Research

Rejected because the proposed functionality substantially duplicated the baseline equipment-loadout system.

## Tactiques de combat / Protocoles de combat avances

Rejected as Academy Research directions. The player should not need Academy progression to author combat-ability priorities or combat-priority profiles.

---

# 9. CURRENT SHORTLIST

Current Academy expansion state beyond factions:

1. Organisation avancée des ouvriers — VALIDATED / IMPLEMENTED at T6
2. Procédés de raffinage avancés — VALIDATED / IMPLEMENTED at T7
3. Consignes d'exploration — STRONG CANDIDATE
4. Analyse tactique — CANDIDATE, presentation unresolved

Abandoned / rejected:

- Doctrine d'equipement -> loadouts are baseline Character functionality and are not Academy-gated.
- Tactiques de combat -> rejected as an Academy Research direction.
- Protocoles de combat avances -> rejected with Tactiques de combat.

Deferred:

- Fabrication specialisee -> wait for active Quality gameplay;
- Dungeon Preparations -> wait for higher dungeon difficulties/challenge modes.

The Academy should not be filled with artificial Research entries merely to create volume. Fewer high-impact functional unlocks are preferred.

DOCUMENT TERMINE
