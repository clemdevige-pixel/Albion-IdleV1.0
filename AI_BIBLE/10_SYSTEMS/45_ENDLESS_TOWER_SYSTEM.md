# 45 — ENDLESS TOWER SYSTEM

Status: GAME DESIGN BASELINE VALIDATED — NOT IMPLEMENTED
Authority: canonical design contract for Albion Idle first endgame activity
Last update: 2026-08-23

---

# 1. PURPOSE

The Endless Tower is the first dedicated endgame activity of Albion Idle.

Its primary design purpose is NOT to add a new permanent stat layer.

It exists to make previous equipment tiers remain relevant after the player reaches the end of the main T4-T8 progression.

The Tower must create a real long-term reason to own, improve and Awaken equipment at several tiers:

- T4;
- T5;
- T6;
- T7;
- T8.

The Tower must reuse the existing tier restrictions instead of introducing downscaling.

A higher-tier equipment set cannot substitute for the tier required by a Tower block.

This is the central evergreen rule:

> A player who neglects one equipment tier must eventually encounter a Tower wall on that tier, even if the player's higher-tier equipment is extremely strong.

The Tower is therefore a multi-set endgame activity, not a replacement for the World, Dungeons, Expeditions or production loops.

---

# 2. ACCESS / DISCOVERY LOOP

The Tower is NOT visible or accessible by default.

Its discovery follows the same world-discovery -> Academy-understanding pattern already used by the Dungeon Relic and Enchantment discovery loops.

Validated flow:

`final boss of the final Black-zone segment`
`-> unique Tower-discovery resource/object drops`
`-> discovery becomes known to the Academy`
`-> Academy Research becomes available`
`-> Research completion permanently unlocks the Endless Tower`

Important:

- the exact item ID/name is NOT validated yet;
- the exact Research name, duration and cost are NOT validated yet;
- implementation must resolve the authoritative final Black-zone boss/segment from existing world content data rather than inventing a duplicate source ID;
- the discovery resource is a trigger for Research visibility, not a parallel unlock flag;
- the permanent Tower capability must be owned through the existing Research unlock architecture.

The Academy discovers/understands the Tower. The Tower itself remains an independent endgame system.

---

# 3. CORE STRUCTURE

The Tower is endless.

Progression is divided into blocks of exactly 5 rooms/floors.

Baseline block structure:

- rooms 1-4: normal combat rooms;
- room 5: elite or block boss encounter;
- completing room 5 validates the block;
- a checkpoint is permanently unlocked after the block is completed.

Example:

- floors 1-5 = block 1;
- floors 6-10 = block 2;
- floors 11-15 = block 3;
- etc.

Major bosses occur every 25 floors.

Baseline cadence:

- floor 5 / 10 / 15 / 20: normal block climax;
- floor 25: major boss;
- floor 30 / 35 / 40 / 45: normal block climax;
- floor 50: major boss;
- and so on indefinitely.

Major-boss cadence is a V1 design baseline and may be tuned later without changing the structural contract.

---

# 4. BLOCK IDENTITY — TIER + FACTION

Each 5-room block owns one fixed:

- equipment Tier;
- enemy Faction.

Both remain constant for the full block.

Reason:

Albion Idle is intended to increasingly ask the player to make equipment decisions from multiple interacting axes:

- required equipment Tier;
- faction-resistant capes;
- weapons that may later perform differently against specific factions;
- weapon Awakening investment;
- general build optimization.

Changing Tier and Faction every individual room would create excessive equipment-management friction.

Therefore the RNG/authoring unit is the BLOCK, not each room.

The player should normally make one meaningful loadout decision before entering the block and then play its five rooms with that setup.

---

# 5. BLOCK GENERATION

Tower block order is semi-random rather than fully deterministic or unrestricted random.

Eligible equipment tiers:

- T4;
- T5;
- T6;
- T7;
- T8.

Eligible factions should consume the existing authored faction/content catalog rather than duplicate faction-specific Tower code.

Current canonical faction families available for reuse include:

- Keeper;
- Heretic;
- Undead;
- Morgana.

The exact anti-repetition algorithm is NOT yet numerically validated.

However the generator must preserve these design goals:

- all equipment tiers remain recurring long-term requirements;
- no tier can be permanently avoided through favorable RNG;
- excessive immediate repetition should be prevented;
- faction/tier selection must be data-driven;
- no Keeper/Heretic/Undead/Morgana-specific runtime branches for shared Tower logic.

The upcoming block's Tier and Faction must be visible before commitment so the player can prepare the appropriate equipment.

---

# 6. EQUIPMENT RULE

A Tower block requires equipment compatible with its authored Tier.

The Tower reuses the game's existing hard tier-access philosophy.

It must NOT introduce a new downscale system.

Example:

- T4 Tower block -> T4-compatible equipment;
- T5 Tower block -> T5-compatible equipment;
- ...
- T8 Tower block -> T8-compatible equipment.

A T8 set is not automatically reduced to T4 for a T4 block; it is simply not the correct equipment for that block.

The exact entry validation should reuse the existing tier restriction/equipment authority where technically possible rather than reimplementing independent Tower-only validation.

---

# 7. FAILURE / RETRY / CHECKPOINTS

Failure must create friction without deleting long-term Tower progress.

Validated baseline:

- failure does NOT reset the full Tower;
- failure returns the player to the beginning of the current 5-room block;
- retry has no dedicated Tower-entry cost in the current V1 design;
- previously unlocked checkpoints are permanent;
- the player may restart from any previously unlocked checkpoint;
- highest floor/block reached is retained as permanent progression/record data.

The purpose of failure is to communicate an equipment/progression wall, not to erase hours of previously validated progress.

---

# 8. DIFFICULTY MODEL

The block's Tier determines equipment compatibility and content identity.

Tower depth determines challenge difficulty.

Therefore:

> T4 floor 10 and T4 floor 210 are not equivalent encounters.

They may use the same Tier/faction content family, but the deeper version receives Tower difficulty scaling.

V1 difficulty should initially remain simple.

Primary scaling channels:

- enemy Max HP;
- enemy damage;
- enemy defense.

No mandatory affix/modifier system is included in the first implementation baseline.

Affixes or additional encounter constraints may be considered later only if plain stat scaling fails to provide sufficient variety.

---

# 9. .3 -> .4 PEDAGOGICAL WALL

A core design purpose of the early Tower is to teach the player that normal `.3` progression is no longer sufficient for serious endgame advancement.

Validated progression intent:

- floors 1-10: `.3` equipment remains comfortable;
- floors 11-20: `.3` remains viable but its limitations become visible;
- floors 21-24: `.4` becomes strongly desirable;
- floor 25 major boss: first real `.4` wall.

Floor 25 target experience:

- `.3` = very difficult / near-wall under ordinary conditions;
- fresh `.4` = clearly more realistic route forward.

The floor-25 wall is intended as a gameplay lesson:

> Main-tier progression brought the player into endgame. Awakening is now the next long-term progression layer.

After floor 25, `.4` becomes the normal Tower progression assumption.

---

# 10. POST-25 CONSTANT SCALING BASELINE

For the first design/balance prototype, post-25 difficulty uses a constant progression curve.

Validated provisional baseline:

- every completed 5-floor block after floor 25 adds +1% Tower difficulty;
- the same incremental rule is initially applied to HP, damage and defense scaling channels.

Illustrative target envelope:

| Floor | Difficulty vs floor 25 baseline | Indicative Awake investment target |
|---:|---:|---|
| 25 | baseline | fresh `.4` / Strain 0 |
| 50 | +5% | approximately Strain 10-15 |
| 75 | +10% | approximately Strain 20-25 |
| 100 | +15% | approximately Strain 30 |
| 125 | +20% | approximately Strain 40 |
| 150 | +25% | approximately Strain 50+ |

IMPORTANT:

These values are NOT final balance guarantees.

They are a design calibration starting point only.

Awakened power varies significantly with:

- selected traits;
- rolls;
- Critical Attunement;
- weapon profile;
- mastery;
- faction matchup;
- cape choice;
- defensive/sustain investment.

Final Tower scaling must therefore be validated later through live combat simulation/benchmarks rather than derived only from displayed IP or Strain.

---

# 11. RELATIONSHIP WITH AWAKENED WEAPONS

The Tower does not replace or extend the internal Awake economy.

Awakening already owns:

- `.3 -> .4` acquisition through Enchantment;
- Attunement;
- initial Awakening threshold;
- traits;
- Critical Attunement;
- Strain;
- increasing Attunement/Silver modification costs;
- full reset.

The Tower must NOT add a second mandatory currency/material directly into trait modification merely to create Tower rewards.

Instead, the Tower gives the existing Awake system a gameplay purpose:

- maintain a strong T4 weapon for T4 blocks;
- maintain a strong T5 weapon for T5 blocks;
- maintain a strong T6 weapon for T6 blocks;
- maintain a strong T7 weapon for T7 blocks;
- maintain a strong T8 weapon for T8 blocks.

This is the current answer to the pre-endgame replayability gap where a player reaching T8 otherwise has limited reason to invest deeply into lower-tier `.4` weapons.

Reference:

- `AI_BIBLE/10_SYSTEMS/20_AWAKENED_WEAPON_SYSTEM.txt`
- `AI_BIBLE/10_SYSTEMS/33_ENCHANTMENT_SYSTEM.txt`

---

# 12. ENCOUNTER CONTENT

V1 should reuse existing combat content as much as possible.

For a block's selected Faction/Tier:

- rooms 1-4 use appropriate existing normal/elite combat profiles;
- room 5 uses an elite/boss profile from the same block identity;
- major-boss floors may initially reuse appropriate existing bosses with Tower scaling.

Dedicated Tower-only monsters/bosses are NOT required for the first implementation.

They may be added later if the system proves valuable and needs stronger identity.

The Tower must not create parallel copies of monsters solely to apply Tower scaling. Scaling should be composition/runtime data applied to existing authored encounter definitions wherever architecture permits.

---

# 13. REWARDS — V1 PRINCIPLES

The complete Tower reward economy is intentionally NOT locked yet.

Validated principles only:

## 13.1 Normal rooms

Normal rooms may grant existing combat rewards such as:

- Silver;
- Fame;
- small quantities of already-existing resources appropriate to the context.

The Tower must NOT become the best universal farming source for every existing resource.

Specialized systems must retain their role:

- World combat;
- Dungeons;
- Expeditions;
- Gathering;
- Crafting/Refining.

## 13.2 Block completion

Completing room 5 grants a block-completion reward/chest.

Its content should be related to the block's Tier/context, but the exact loot table is not yet validated.

## 13.3 Major bosses

Major bosses every 25 floors grant a larger guaranteed reward and may also drive Achievements/prestige milestones.

Exact major-boss reward content is not yet validated.

## 13.4 First clear vs repeat

First completion of a block/milestone should be more valuable than repeating already-cleared content.

Repeated blocks may remain rewarding, but at reduced value so an easy old checkpoint does not become the optimal universal farm.

## 13.5 No new permanent stat layer

The first Tower design does NOT introduce:

- a Tower perk tree;
- separate Tower combat stats;
- a generic account-wide power tree;
- tier-specific permanent stat bonuses.

A Tower-exclusive currency/resource may be considered later only if actual playtesting demonstrates that progression/prestige plus existing-economy rewards are insufficient.

---

# 14. PERSISTENCE

The Tower requires its own persistent authoritative state.

At minimum persistence must be able to represent:

- Tower unlocked state derived from Research capability;
- highest validated floor/block;
- unlocked checkpoints;
- current active block/run state if persistence during a block is supported;
- first-clear state required by reward logic;
- deterministic/authoritative generated block identity if a block has already been committed.

Do not save duplicate capability booleans if they can be derived from Research unlock state.

Generated Tier/Faction identity must not reroll for free merely because the player reloads the game.

---

# 15. UI / UX CONTRACT

Before entering a block, the player must be able to see at minimum:

- block floor range;
- required Tier;
- enemy Faction;
- whether the block contains a major boss;
- current checkpoint / highest progression context.

The player must be allowed to prepare equipment between blocks.

The Tower must not create a forced equipment-swap interaction every individual room because Tier/Faction remain stable for all 5 rooms.

Detailed visual layout is not validated in this document.

---

# 16. DATA-DRIVEN IMPLEMENTATION RULES

The Tower must be authored from data/config rather than hardcoded floor-specific branches.

Expected authored data responsibilities include:

- block size;
- major-boss cadence;
- eligible tiers;
- eligible factions;
- block generation/anti-repeat rules;
- difficulty baseline and per-block growth;
- encounter-selection pools;
- reward tables;
- discovery Research unlock ID;
- checkpoint cadence.

Runtime should own generic mechanics only:

- generate/commit next block;
- validate entry/loadout through shared authorities;
- route combat encounters;
- apply depth scaling;
- advance room/block state;
- process failure;
- unlock checkpoints;
- grant authored rewards;
- persist state.

Forbidden architecture:

- floor 25/floor 50/etc. bespoke code when cadence data can express it;
- duplicated combat-stat formulas;
- duplicated tier-validation rules where existing gameplay authority can be reused;
- faction-specific Tower branches for shared mechanics;
- UI-owned Tower progression authority;
- save/reload reroll exploitation of committed block identities.

---

# 17. VALIDATED V1 LOOP SUMMARY

`finish main T4-T8 progression`
`-> defeat boss of final Black-zone segment`
`-> obtain Tower discovery resource`
`-> Academy Research revealed`
`-> Research completed`
`-> Endless Tower unlocked`

Then:

`preview next 5-floor block`
`-> fixed Tier + Faction`
`-> prepare matching loadout`
`-> rooms 1-4 combat`
`-> room 5 elite/boss`
`-> checkpoint + block reward`
`-> next semi-random Tier/Faction block`
`-> repeat endlessly`

Difficulty intent:

`.3 comfortable early`
`-> increasing pressure`
`-> floor 25 major boss = first .4 wall`
`-> after floor 25: +1% difficulty per 5-floor block provisional baseline`
`-> deeper Tower increasingly rewards real Awake investment across every Tier`

---

# 18. OPEN DESIGN ITEMS

The following are deliberately NOT invented/locked yet:

- Tower discovery item name/ID;
- Academy Research name;
- Research cost/duration;
- exact final Black-zone source IDs until implementation audit;
- exact Tier/Faction anti-repeat algorithm;
- exact normal-room encounter counts/composition;
- exact block-boss selection rule;
- exact major-boss roster;
- exact reward tables;
- any Tower-exclusive reward/currency;
- final numerical difficulty balance.

These points require a dedicated implementation/balance pass and must not be silently filled with arbitrary constants.

---

DOCUMENT END
