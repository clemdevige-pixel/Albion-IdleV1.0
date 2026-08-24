# 44B_ACADEMY_RESEARCH_IDEAS

Status: DESIGN BACKLOG / PARTIALLY VALIDATED
Authority: idea backlog for future Academy expansion
Last update: 2026-08-24

---

# PURPOSE

This document records Academy Research ideas beyond the faction / Cartography / Archaeology loop.

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

# 2. NOT RETAINED — CONSIGNES D'EXPLORATION

Status: NOT RETAINED FOR CURRENT IMPLEMENTATION

The idea was to add configurable safety/automation rules to the existing Farm/Progression loop.

Examples considered:

- after X deaths on the current progression target -> switch back to Farm;
- after X failed attempts -> return to the last sustainable farming point;
- if healing consumables reach zero -> stop Progression or switch to Farm.

The current death flow explicitly waits for the player to press `Reprendre l'exploration`. Making these rules useful would therefore require an Academy unlock to alter the death/resume loop itself.

This is too invasive for a QoL Research whose main purpose was idle convenience. Do not implement it unless the global death/resume philosophy is redesigned separately.

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

# 4. VALIDATED / IMPLEMENTED — ANALYSE DES RENDEMENTS

Status: VALIDATED CONTRACT / IMPLEMENTED

## 4.1 Research contract

Research:

- id: `research_yield_analysis`;
- display name: `Analyse des rendements`;
- Academy tier: T5;
- cost: 15,000 Silver;
- material cost: none;
- duration: 1h;
- unlock id: `dashboard:resource_yield_tracking`.

The cost/duration reuse the existing T5 Academy baseline already used by Cartography II and Archéologie II.

## 4.2 Dashboard contract before Research

The Dashboard `Rendement` module remains baseline functionality and displays only:

- Silver / heure;
- Fame / heure.

These are projected values for the active world segment using the existing authoritative projected-rate resolver.

No resource favorite control is available before the Research completes.

## 4.3 Unlock behavior

After completion:

- trackable resource items expose the favorite/star control in Inventory and Bank;
- exactly ONE resource may be followed at a time in V1;
- selecting another resource replaces the previous tracked resource;
- the old standalone `tracked-resources` Dashboard card is removed from the active layout;
- the tracked resource is presented directly inside the existing `Rendement` module.

The tracked row displays:

- resource identity;
- total current stock;
- projected/current production rate per hour.

Stock combines the authoritative quantities held in:

- hero inventory;
- bank;
- production storage.

The persisted favorite remains a UI preference and must never become a second gameplay authority.

## 4.4 Yield-source rules

The item-rate resolver is source-driven and keyed by authoritative `itemId`.

World combat / monster loot:

- projected from the same authored combat loot expectations used by runtime combat;
- Faction Mastery yield modifiers remain part of the projection when applicable;
- a resource not produced by the current segment resolves to `0/h`.

Gathering:

- active hero gathering contributes the matching raw resource output rate;
- rate derives from the active gathering cycle duration and authored base yield;
- no fabricated zone-wide gathering rate is shown when the corresponding gathering activity is not active.

Refining:

- refined resources remain trackable even when idle;
- idle refining contributes `0/h`;
- while the matching refining recipe is active, the tracked output shows `outputQuantity / cycleDuration` converted to `/h`;
- recipe definitions remain authoritative for output and duration.

The Dashboard must not maintain a second loot/gather/refining balance table.

## 4.5 Architecture rules

- `ResearchService` unlock state remains the authority for availability of resource favorites;
- the Dashboard consumes existing gameplay catalogs/resolvers instead of duplicating source rates;
- resource tracking is generic by item id, not hardcoded by resource family;
- adding future authored monster resource drops should automatically make them projectable through the combat-loot expectation path;
- one tracked resource is a presentation choice only and does not alter loot, gathering, refining or inventory behavior.

---

# 5. VALIDATED / IMPLEMENTED — ORGANISATION AVANCEE DES OUVRIERS

Status: VALIDATED CONTRACT / IMPLEMENTED

## 5.1 Baseline worker contract

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

## 5.2 Research contract

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

## 5.3 Progression reason

This unlock is intentionally placed at T6 rather than T7.

Newly recruited workers start with their own mastery at level 0 and therefore begin on T3 gathering content. They remain subject to the normal worker gathering mastery gates:

- T3 -> mastery 0;
- T4 -> mastery 3;
- T5 -> mastery 7;
- T6 -> mastery 11;
- T7 -> mastery 18;
- T8 -> mastery 25.

Giving access at T6 gives the second generation of workers time to progress before the largest T7/T8 resource requirements.

## 5.4 Architecture rules

The implementation is WorkerId-first:

- profession is a worker property, not worker identity;
- multiple workers of one profession must coexist independently;
- mastery, tier, session, pause/resume and save state remain per WorkerId;
- the ResearchService unlock is the authority for advanced roster capacity;
- no duplicated boolean or worker-specific Research branch may become a second authority;
- UI must expose each worker independently inside its gathering building.

Research unlocks capacity only. It does NOT grant generic worker yield/speed bonuses.

---

# 6. VALIDATED / IMPLEMENTED — PROCEDES DE RAFFINAGE AVANCES

Status: VALIDATED CONTRACT / IMPLEMENTED

## 6.1 Research contract

Research:

- id: `research_instant_refining`;
- display name: `Procédés de raffinage avancés`;
- Academy tier: T7;
- cost: 80,000 Silver;
- material cost: none;
- duration: 3h;
- unlock id: `refining:instant_batch`.

## 6.2 Gameplay effect

Before this Research, refining uses the normal timed automatic cycle system.

After completion, each refining building exposes instant batch refining for the selected family/tier:

- one action converts every currently payable cycle for that recipe;
- no timed refining session is started for that batch;
- input requirements remain exactly those of the authored recipe;
- Tn recipes still consume the authored Tn-1 refined prerequisite;
- output quantity and yield remain unchanged;
- no bonus resource, speed multiplier or altered refining ratio is granted.

## 6.3 Architecture rules

- `ResearchService` unlock state is the authority for availability;
- recipe definitions remain the authority for costs and outputs;
- do NOT implement the unlock by authoring `durationTicks = 0` variants;
- do NOT duplicate refining recipes or create a second refining economy;
- instant conversion must consume the maximum payable batch atomically;
- if output cannot be stored atomically, inputs must not be lost;
- the original timed refining path remains unchanged while the Research is locked.

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

Rejected because the proposed functionality substantially duplicated the baseline equipment-loadout system.

## Tactiques de combat / Protocoles de combat avances

Rejected as Academy Research directions. The player should not need Academy progression to author combat-ability priorities or combat-priority profiles.

---

# 10. CURRENT SHORTLIST

Current Academy expansion state beyond factions:

1. Analyse des rendements — VALIDATED / IMPLEMENTED at T5
2. Organisation avancée des ouvriers — VALIDATED / IMPLEMENTED at T6
3. Procédés de raffinage avancés — VALIDATED / IMPLEMENTED at T7
4. Analyse tactique — CANDIDATE, presentation unresolved

Not retained / rejected:

- Doctrine d'equipement -> loadouts are baseline Character functionality and are not Academy-gated.
- Consignes d'exploration -> not retained while death requires explicit manual resume.
- Tactiques de combat -> rejected as an Academy Research direction.
- Protocoles de combat avances -> rejected with Tactiques de combat.

Deferred:

- Fabrication specialisee -> wait for active Quality gameplay;
- Dungeon Preparations -> wait for higher dungeon difficulties/challenge modes.

The Academy should not be filled with artificial Research entries merely to create volume. Fewer high-impact functional unlocks are preferred.

DOCUMENT TERMINE
