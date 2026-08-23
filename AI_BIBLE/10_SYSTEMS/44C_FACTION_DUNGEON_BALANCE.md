# 44C_FACTION_DUNGEON_BALANCE

Status: VALIDATED BALANCE BASELINE / IMPLEMENTATION PARTIAL
Authority: faction Dungeon progression balance appendix
Last update: 2026-08-23

Reference contract:

- `AI_BIBLE/10_SYSTEMS/44_FACTION_RESEARCH_EXPLORATION_SYSTEM.txt`

This document records the validated progression intent and benchmark findings for faction Dungeons, faction capes and future faction weapons.

---

# 1. PROGRESSION INTENT

Faction Dungeons are not intended to be four equivalent same-tier challenges.

The validated progression loop is sequential:

1. the player enters the first Dungeon of the loop with normal/base equipment;
2. clearing it grants access to its artifact path;
3. that artifact is used to craft a faction weapon;
4. the faction weapon is the progression lever used to open the next Dungeon;
5. the same pattern repeats through the Dungeon chain.

The purpose of the faction weapon is therefore not only raw power. It is a controlled progression key against the next target faction.

---

# 2. T4 BOOTSTRAP TARGET

The first Dungeon of the T4 loop is Keeper.

Validated benchmark target:

`base weapon T4.3 + matching faction cape T4.3 + health potion -> 100% Keeper T4 clear`

This guarantee exists so a player cannot become progression-locked before obtaining the first faction artifact/weapon path.

The other T4 faction Dungeons should remain close to 0% clear with base weapons at the same benchmark loadout until the appropriate faction weapon is introduced.

The intended shape is therefore:

`base weapon -> Keeper clear guaranteed -> faction weapon -> next Dungeon -> next faction weapon -> ...`

---

# 3. KEEPER T4 BENCHMARK RESULT

The current benchmark candidate for Keeper T4 applies, in the benchmark only:

- enemy HP multiplier: `0.85`;
- enemy damage multiplier: `0.85`;
- enemy Armor/Magic Resistance multiplier: `0.95`.

With the five current base weapon families in T4.3, matching Keeper cape and health potions, the benchmark produced:

- Broadsword: clear;
- Longbow: clear;
- Infernal: clear;
- Spiked Gauntlets: clear;
- Dual Dagger: clear.

Result: `5/5`, 100% clear.

The surviving HP range remained low enough for the Dungeon to stay meaningful rather than trivial.

IMPORTANT:

These Keeper profile multipliers are still benchmark-side calibration values and are not automatically equivalent to final authored live Dungeon values until explicitly migrated into live content.

---

# 4. BASE-WEAPON T4 DUNGEON SHAPE

Before faction-weapon simulation, the T4 benchmark with base weapons, matching capes and potions produced the following clear shape:

| Dungeon | Base weapon clears |
|---|---:|
| Keeper T4 | 5/5 after bootstrap calibration |
| Heretic T4 | 0/5 |
| Undead T4 | 0/5 |
| Morgana T4 | 0/5 |

This is considered directionally correct for the intended progression loop.

Do not globally reduce all same-tier faction Dungeons to the same accessibility level.

---

# 5. FACTION WEAPON BONUS BASELINE

Validated design baseline:

**A faction weapon gains +20% damage against its authored target faction while inside that faction Dungeon.**

This is a Dungeon-specific progression modifier.

It is NOT currently intended as a +20% global-world modifier against that faction, because such a global modifier would risk disturbing open-world combat, farming and boss balance.

The +20% value is the shared starting rule for future faction weapons.

However, final per-weapon performance must still be validated when each faction weapon actually exists.

Reasons:

- weapon AA contribution differs;
- spell contribution differs;
- DoT contribution differs;
- cooldown cadence differs;
- potion timing can interact with encounter duration;
- the resulting effective gain is therefore not identical across all weapon archetypes.

The system rule is fixed as a baseline; final weapon/Dungeon tuning remains empirical.

---

# 6. HERETIC T4 CALIBRATION STATUS

Heretic T4 was used as the second-link calibration target with simulated faction weapons.

Benchmark target:

- base weapons: `0/5` clears;
- simulated faction weapon with +20% Dungeon damage: `5/5` clears.

Best tested profile so far:

- HP multiplier: `0.89`;
- damage multiplier: `0.95`;
- defense multiplier: `0.97`.

Result:

- base weapons: `0/5`;
- simulated faction weapons +20%: `4/5`;
- Spiked Gauntlets was the only failure, reaching `98.9%` boss progress.

This proves the +20% baseline is close to a usable progression threshold, but Heretic live balance must NOT be finalized from this simulation alone because the actual faction weapon has not yet been authored.

Final Heretic calibration is intentionally deferred until the real faction weapon exists.

---

# 7. FACTION CAPES

Faction capes are authored from `factionCapeContentCatalog.ts`.

For T4, base stats are:

- Armor: `3`;
- Magic Resistance: `5`;
- matching-Dungeon damage reduction: `6%`.

The special matching-Dungeon reduction does not increase with enchantment.

Normal enchantment stat multipliers remain:

- `.0`: `x1.00`;
- `.1`: `x1.12`;
- `.2`: `x1.26`;
- `.3`: `x1.42`.

Therefore the cape defensive stats scale with enchantment, while the faction Dungeon reduction remains the authored tier value.

Faction capes are valid normal-enchantment items through `.3`.

A prior inconsistency existed because:

- the generic enchantment resolver considered crafted faction capes enchantable;
- the in-game Enchanter used `ENCHANTMENT_ITEM_POLICY`, where faction capes were missing.

This has been corrected by deriving the faction-cape enchantment policy from faction cape content rather than manually duplicating every cape ID.

Faction capes remain ineligible for `.4` Awakening.

---

# 8. BENCHMARK EQUIPMENT CONTRACT

Current Dungeon balance benchmarks use:

- same-tier equipment;
- enchantment `.3`;
- matching faction cape;
- health potions where the scenario requires them;
- real runtime combat behavior through the existing benchmark harness.

Because faction capes are enchantable, a T4.3 benchmark means the cape is also T4.3 for its normal Armor/Magic Resistance stats.

Potion cooldowns remain continuous through Dungeon encounters in runtime-derived benchmarks. This can create non-monotonic results when higher DPS changes encounter durations and potion availability.

This behavior should be preserved in final runtime validation rather than hidden by benchmark-only potion resets.

---

# 9. CURRENT BASE-WEAPON BALANCE CANDIDATES

The Dungeon benchmark currently carries benchmark-only weapon tuning candidates used to reduce large archetype disparities before Dungeon calibration.

Current candidates:

- Broadsword: unchanged;
- Longbow: auto-attack multiplier `0.84`;
- Infernal:
  - Fireball direct damage `x1.05`;
  - Cataclysm direct damage `x1.10`;
  - fire effect/DoT damage `x1.50`;
- Spiked Gauntlets: unchanged;
- Dual Dagger:
  - Double Slash `x1.10`;
  - Flurry `x1.10`.

These values remain benchmark-only candidates until explicitly approved for live weapon data.

Do not treat them as authored production values merely because Dungeon benchmarks consume them.

---

# 10. IMPLEMENTATION RULES

Dungeon/faction balance must remain data-driven.

Required direction:

- faction weapon target bonus should be authored data, not faction-specific runtime branches;
- Dungeon profiles should be authored per progression need rather than hardcoded by faction name in combat runtime;
- benchmark-only tuning must remain clearly separated from live authored content;
- matching faction cape behavior must come from faction cape definitions;
- benchmark harnesses must use the same authoritative item/enchantment/combat systems wherever possible.

Forbidden direction:

- adding Keeper/Heretic/Undead/Morgana `if` branches to shared combat damage logic;
- globally buffing faction weapons against open-world faction mobs solely to solve Dungeon progression;
- balancing all faction Dungeons to identical clear rates;
- baking temporary benchmark multipliers into live data without explicit validation.

---

# 11. NEXT VALIDATION POINT

When faction weapons are created, validate each link independently.

For each weapon/Dungeon link:

1. run base weapon benchmark;
2. confirm the target Dungeon remains near 0% clear without the progression weapon;
3. run the actual faction weapon with the +20% Dungeon target bonus;
4. inspect AA / spell / DoT contribution;
5. inspect potion usage and encounter timing;
6. adjust the Dungeon profile minimally until the intended clear reliability is reached;
7. only then promote benchmark values into authored live content.

The actual faction weapon kit is therefore part of the final Dungeon difficulty contract.

---

# 12. VALIDATED SUMMARY

Validated now:

- Keeper T4 is the bootstrap Dungeon;
- Keeper bootstrap target = 100% clear with base T4.3 weapon + matching T4.3 faction cape + potion;
- subsequent Dungeons should stay near 0% with base weapons before their progression weapon is obtained;
- faction weapon baseline = +20% damage against the authored target faction inside its Dungeon only;
- faction capes are enchantable `.0` through `.3` and their normal defensive stats scale with enchantment;
- faction cape Dungeon reduction remains tier-authored and does not scale with enchantment;
- actual faction weapon kits will be benchmarked case by case before final Dungeon values are locked.

Not yet final:

- live Keeper profile migration;
- final Heretic profile;
- Undead/Morgana calibration;
- T5-T8 Dungeon chain calibration;
- final live weapon tuning candidates;
- final individual faction weapon kits.

DOCUMENT TERMINE
