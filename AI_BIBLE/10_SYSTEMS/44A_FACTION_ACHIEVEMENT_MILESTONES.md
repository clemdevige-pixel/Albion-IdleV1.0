# Albion Idle — Faction Achievement Milestones

Status: VALIDATED / IMPLEMENTED
Parent design: `AI_BIBLE/10_SYSTEMS/44_FACTION_RESEARCH_EXPLORATION_SYSTEM.txt`
Last update: 2026-08-22

---

# 1. PURPOSE

This document locks the Achievement milestone set associated with Faction / Expedition progression.

The existing `World > Achievements` surface remains authoritative.

Achievements are feedback only. They MUST NOT unlock Research, Expeditions, Dungeons, combat power or faction yield.

Functional unlock authority belongs to Academy / Research. Faction-yield progression belongs to Faction Mastery.

The previous one-Relic-per-faction design has been removed. Therefore the old `Relic Reconstructed · <Faction>` milestones are removed rather than repointed to the new global Dungeon Relic.

---

# 2. FACTION ACHIEVEMENT TEMPLATE

The same structure is reused for Keeper, Heretic, Undead and Morgana.

Per faction:

## Discovery

### Discovery
- discover / defeat the two main normal units of the faction.

## Faction kills

### Hunter I
- 25 lifetime faction kills.

### Hunter II
- 100 lifetime faction kills.

### Hunter III
- 500 lifetime faction kills.

## Elite kills

### Elite Hunter
- 3 faction elite kills.

### Veteran Hunter
- 25 faction elite kills.

## Faction Expeditions

### Explorer
- complete 1 Expedition of the faction.

### Expeditionary
- complete 10 Expeditions of the faction.

Offline-resolved Expeditions count normally.

## Faction Dungeons

### Conqueror
- complete 1 Dungeon of the faction.

### Veteran Conqueror
- complete 10 Dungeons of the faction.

## Faction Mastery

### Mastery I
- reach Faction Mastery 25.

### Mastery II
- reach Faction Mastery 50.

### Mastery III
- reach Faction Mastery 75.

### Mastery IV
- reach Faction Mastery 100.

---

# 3. GLOBAL EXPEDITION ACHIEVEMENTS

### First Expedition
- complete any Expedition once.

### Regular Expeditionary
- complete 10 Expeditions total.

### Veteran Expeditionary
- complete 50 Expeditions total.

### First Silver Expedition
- complete one generic Silver Expedition.

### Expedition Fortune
- earn 1,000,000 cumulative Silver actually credited by generic Silver Expeditions.

---

# 4. CONTENT VOLUME

Per faction:

- 1 Discovery;
- 3 faction-kill milestones;
- 2 elite-kill milestones;
- 2 faction-Expedition milestones;
- 2 faction-Dungeon milestones;
- 4 Faction Mastery milestones.

Total:

- 14 Achievements per faction;
- 56 faction Achievements across four factions;
- 5 global Expedition Achievements;
- 61 Achievements for this feature set.

No Achievement is currently authored specifically for the global Dungeon Relic discovery chain. Adding one later requires a separate design decision; it must not be inferred from the removed faction-Relic milestones.

---

# 5. PRESENTATION

Reuse `World > Achievements`.

Preferred grouping:

1. World
2. Factions
3. Expeditions

Faction entries should remain filterable/grouped by faction.

Progressive presentation is preferred over dumping distant milestones into the first view.

---

# 6. OWNERSHIP

Bestiary owns monster knowledge/discovery.

Masteries owns Faction Mastery progression.

Academy / Research owns functional content unlocks.

Achievements only read authoritative state from those systems.

---

# 7. DATA-DRIVEN CONDITIONS

Current reusable conditions:

- `faction_unit_discovery`;
- `faction_kill_count`;
- `faction_elite_kill_count`;
- `faction_expedition_completed_count`;
- `faction_dungeon_completed_count`;
- `faction_mastery_level`;
- `expedition_completed_count`;
- `silver_expedition_completed_count`;
- `silver_expedition_lifetime_silver`.

Do not create faction-specific runtime branches.

DOCUMENT TERMINE
