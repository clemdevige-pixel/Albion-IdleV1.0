# Albion Idle — Faction Achievement Milestones

Status: VALIDATED FUTURE DESIGN / NOT IMPLEMENTED
Parent design: `AI_BIBLE/10_SYSTEMS/44_FACTION_RESEARCH_EXPLORATION_SYSTEM.txt`
Last update: 2026-08-21

---

# 1. PURPOSE

This document locks the validated Achievement milestone set for the future Faction Research / Expedition feature.

It complements the parent system document without creating a new Achievement system.

The existing `World > Achievements` surface remains authoritative for Achievement presentation.

Achievements are completion/progression feedback only in V1.

They MUST NOT:

- grant combat power;
- grant faction-yield bonuses;
- unlock Research;
- unlock Expeditions;
- unlock dungeons;
- replace Faction Mastery progression.

Functional unlock authority remains in Academy / Research.
Faction-yield progression remains in Faction Mastery.

---

# 2. FACTION ACHIEVEMENT TEMPLATE

The same Achievement structure is reused for Keeper, Heretic, Undead and Morgana.

Only authored faction references/names change.

Each faction uses the following milestones.

## 2.1 Discovery

### Discovery
Condition:
- discover / defeat the two main normal units of the faction.

Purpose:
- confirms basic faction discovery;
- naturally overlaps with the first deterministic Relic objective without becoming an unlock authority.

## 2.2 Faction kills

### Hunter I
Condition:
- 25 faction kills.

### Hunter II
Condition:
- 100 faction kills.

### Hunter III
Condition:
- 500 faction kills.

These thresholds track lifetime faction kills.

## 2.3 Elite kills

### Elite Hunter
Condition:
- defeat 3 faction elites.

### Veteran Hunter
Condition:
- defeat 25 faction elites.

These thresholds track lifetime faction elite kills.

## 2.4 Relic

### Relic Reconstructed
Condition:
- reconstruct the faction Relic.

The Relic remains a Research prerequisite / faction-discovery system object.
The Achievement only records completion.

## 2.5 Faction Expeditions

### Explorer
Condition:
- complete 1 Expedition of the faction.

### Expeditionary
Condition:
- complete 10 Expeditions of the faction.

These count completed Expeditions, including Expeditions resolved while the player was offline.

## 2.6 Faction dungeons

### Conqueror
Condition:
- complete 1 dungeon of the faction.

### Veteran Conqueror
Condition:
- complete 10 dungeons of the faction.

Dungeon entry/key rules remain unchanged and are not owned by Achievements.

## 2.7 Faction Mastery milestones

### Mastery I
Condition:
- reach Faction Mastery level 25.

### Mastery II
Condition:
- reach Faction Mastery level 50.

### Mastery III
Condition:
- reach Faction Mastery level 75.

### Mastery IV
Condition:
- reach Faction Mastery level 100.

Faction Mastery itself is displayed primarily in the existing Masteries module, under a dedicated faction family/category.

The Achievement view only records these milestone completions.

---

# 3. GLOBAL EXPEDITION ACHIEVEMENTS

These milestones are faction-independent and track the Expedition system globally.

### First Expedition
Condition:
- complete any Expedition once.

### Regular Expeditionary
Condition:
- complete 10 Expeditions total.

### Veteran Expeditionary
Condition:
- complete 50 Expeditions total.

### First Silver Expedition
Condition:
- complete one generic Silver Expedition.

### Expedition Fortune
Condition:
- earn 1,000,000 cumulative Silver from generic Silver Expeditions.

Cumulative Silver means the lifetime total actually credited by the Silver Expedition system.

Faction Mastery does not affect this source.

---

# 4. CONTENT VOLUME

Validated target per faction:

- 1 Discovery milestone;
- 3 faction-kill milestones;
- 2 elite-kill milestones;
- 1 Relic milestone;
- 2 faction-Expedition milestones;
- 2 faction-dungeon milestones;
- 4 Faction Mastery milestones.

Total:

- 15 Achievements per faction;
- 60 faction Achievements across the initial four factions;
- 5 validated global Expedition Achievements.

Initial validated system total from this feature:

- 65 Achievements.

Existing World/dungeon Achievements remain separate and continue to coexist in the same Achievement surface.

---

# 5. PRESENTATION / VISIBILITY

Reuse the existing `World > Achievements` view.

Recommended grouping:

1. World
2. Factions
3. Expeditions

Faction Achievements should be grouped/filterable by faction where needed to avoid presenting all 60 faction entries as one undifferentiated list.

Progressive presentation is preferred:

- do not dump every distant milestone into the player's first view;
- the UI may prioritize the next incomplete milestone in a chain;
- completed milestones remain reviewable;
- hidden/locked presentation must not conceal information required to understand a currently actionable objective.

Exact final UI composition remains a future UX implementation task.

---

# 6. BESTIARY / MASTERY OWNERSHIP

The Bestiary remains the faction knowledge / Relic progression surface.

It may expose:

- faction identity;
- monster discovery;
- kill counts;
- elite/boss victories;
- Relic objective contribution/progress;
- Expedition unlock state;
- dungeon unlock state.

Faction Mastery progression is NOT primarily owned by the Bestiary.

Faction Masteries must appear in the existing Masteries module as a faction mastery family/category, with at minimum:

- faction name;
- level 0-100;
- current XP / next-level XP;
- current faction-yield bonus.

The Achievement view may reference Mastery milestone completion but does not replace the Masteries UI.

---

# 7. DATA-DRIVEN REQUIREMENTS

Achievement implementation must remain definition-driven.

Do not create duplicated Keeper/Heretic/Undead/Morgana runtime branches.

Expected reusable condition types include:

- faction_unit_discovery;
- faction_kill_count;
- faction_elite_kill_count;
- faction_relic_reconstructed;
- faction_expedition_completed_count;
- faction_dungeon_completed_count;
- faction_mastery_level;
- expedition_completed_count;
- silver_expedition_completed_count;
- silver_expedition_lifetime_silver.

Faction-specific Achievement definitions should reference faction IDs and thresholds as authored data.

---

# 8. VALIDATED V1 REWARD RULE

Achievement reward baseline for this feature:

- no power reward;
- no yield modifier;
- no functional unlock;
- no mandatory currency/material reward.

The Achievement itself is the completion marker in V1.

Any future cosmetic/title/badge/reward layer requires a separate design validation and must not be silently added during implementation.

---

DOCUMENT TERMINÉ
