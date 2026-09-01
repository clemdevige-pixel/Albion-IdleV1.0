# Albion Idle — UI/UX Audit Roadmap Handoff

Date: 2026-09-01
Branch: `agent/albion-idle-development`
Baseline HEAD at handoff creation: `ff29672dee559107071f36389409296baf385555`
Status: **VALIDATED ROADMAP — implementation not started for the roadmap below**

---

## 1. Purpose

This document preserves the validated UI/UX direction in case the work is resumed in another chat/session.

It is not a redesign brief. The current global shell is considered structurally sound and must be preserved unless a future audit proves otherwise.

The objective is to improve clarity, player guidance, consistency and moment-to-moment usability without introducing a parallel UI architecture.

---

## 2. Non-negotiable UI principles

The existing UI Bible remains authoritative, especially:

- `UI_BIBLE/00_PRINCIPLES.txt`
- `UI_BIBLE/02_LAYOUT.txt`
- `UI_BIBLE/03_DESIGN_SYSTEM.txt`
- `UI_BIBLE/04_COMPONENT_LIBRARY.txt`
- `UI_BIBLE/07_RIGHT_PANEL.txt`
- `UI_BIBLE/17_TOOLTIPS.txt`

Key rules that must not be broken:

1. Single-screen experience.
2. Game World remains visible and is visually central.
3. Features integrate into the contextual Right Panel instead of creating separate full screens.
4. Reuse shared components and existing design-system primitives.
5. Readability has priority over decoration.
6. Progressive disclosure: essential information visible, detailed information on demand.
7. Avoid unnecessary layout shifts and parallel interaction systems.
8. New UI must remain compatible with future systems without restructuring the shell.

Current shell architecture to preserve:

`Header -> Game World + Right Panel -> Bottom Navigation`

Do **not** introduce a new global sidebar, fullscreen module pages, floating windows everywhere, or a second navigation system without explicit revalidation.

---

## 3. Recently validated UI work — do not regress

The Inventory / Bank / Equipment polish completed immediately before this roadmap is considered validated.

### Inventory / Bank / Equipment

- Bank tabs are ranges of one shared Bank inventory, not separate storage owners.
- Drag item onto Bank tab -> move to the first compatible destination in that tab.
- Right-click actions support moving items between Bank tabs.
- Inventory right-click supports moving items directly to a Bank tab.
- Storage destination logic is centralized in runtime rather than duplicated in React.
- Compatible stack merge is considered before an empty destination slot.
- Equipment/Bank/Inventory flows remain on the existing storage architecture.

### Relic handling

- The sanctuary/dungeon relic is consumed when the corresponding analysis research starts.
- Legacy saves with the research already active/completed reconcile and remove the orphaned physical relic.

### Enchantment visual language

Shared enchantment diamonds are now part of the item language.

Color contract must remain aligned with the existing enchantment code:

- `.0` grey
- `.1` green
- `.2` blue
- `.3` purple
- `.4` yellow

Validated placement:

- item slot: `Tn.x` bottom-left, enchantment diamonds bottom-right when they do not collide with quantity;
- tooltip: enchantment diamonds on the item title line rather than in a separate large block;
- equipment slots use the same visual scale language as inventory slots.

### Item tooltips

- Tooltip content remains shared.
- Right-click suppresses the hover tooltip while the contextual menu is open.
- Tooltip placement is adaptive and attempts to avoid covering the hovered item / inventory grid / equipment picker when another valid location exists.
- Do not revert to simple `cursor + offset` positioning.

---

## 4. Global audit conclusion

The current problem is **not** that Albion Idle needs a new global interface.

The main remaining UX weakness is that many systems work individually, but the game does not yet provide a strong global hierarchy answering:

> **What deserves the player's attention right now?**

The next UI/UX work should therefore prioritize player attention, consistency and actionability over visual redesign.

---

# 5. VALIDATED ROADMAP

Implementation order is important.

## P0.1 — Global Attention System

### Goal

Create a shared, data-driven representation of meaningful player attention states.

The player should be able to understand that something became actionable without manually opening every module.

Examples of valid attention events/signals:

- research completed / research ready for action;
- enchantment available;
- inventory close to/full capacity;
- worker idle / meaningful Island action available;
- production/refining/crafting action requiring attention;
- important progression unlock;
- other already-existing systems becoming actionable.

These examples are **not** permission to invent new gameplay states. Only expose signals backed by real runtime data.

### Architecture direction

Prefer one shared/data-driven source, conceptually similar to:

`PlayerAttentionState`

or an equivalent existing architecture-compatible abstraction.

It should be consumable by:

- Dashboard;
- bottom navigation badges/markers;
- non-blocking notifications where appropriate.

Do not implement each module with its own independent badge logic if the same state can be derived centrally.

### UX rules

- No blocking popups.
- No notification spam.
- Signals must be concise and semantically consistent.
- Only meaningful/actionable states deserve attention treatment.
- Visual priority must distinguish urgency from simple informational state.

### Definition of done

- Shared attention model exists.
- At least the highest-value existing actionable states are represented.
- Dashboard and navigation consume the same source of truth.
- Signals disappear correctly when the underlying actionable state is resolved.
- Save persistence is added only when actually necessary; do not persist derived state unnecessarily.

---

## P0.2 — Interaction Contract / Global Interaction Grammar

### Goal

Make common interactions predictable everywhere.

Validated target grammar:

- **Click** -> select / inspect.
- **Double-click** -> primary/default action.
- **Right-click** -> contextual actions.
- **Drag & drop** -> move / organize when the concept supports spatial movement.
- **Hover** -> information only.

This is a UX contract, not a requirement to force interactions where they make no sense.

### Work

Audit all major interactive modules and identify exceptions/inconsistencies.

Priority modules:

- Inventory
- Bank
- Character / equipment picker
- Merchant
- Masteries
- Island
- Production modules
- World

Do not add duplicate action paths merely to satisfy the contract. Reuse existing authoritative actions.

### Definition of done

- Major modules follow the same interaction language where applicable.
- Contextual actions are discoverable.
- Disabled interactions explain why when relevant.
- Helper text can eventually be reduced because behavior becomes predictable.

---

## P1.1 — Dashboard: from summary to cockpit

### Current strengths

The Dashboard already:

- aggregates multiple systems;
- uses modular cards;
- supports section reordering;
- persists the player's section order.

Do not replace this architecture.

### Goal

Rework hierarchy so the Dashboard primarily answers:

> **What can/should I do now?**

rather than only:

> What is currently happening?

### Target information hierarchy

1. **Action required / actionable now**
2. **Current activity**
3. **Passive information / yield**

Possible existing card groups include combat, research, yield, enchant-ready and production; preserve the data-driven/current component approach.

### Definition of done

- Actionable states are visually dominant without becoming noisy.
- Passive statistics remain accessible but secondary.
- Attention System P0.1 feeds Dashboard rather than duplicating state detection.
- Player section reordering remains functional unless explicitly revalidated.

---

## P1.2 — Standardize internal module hierarchy

### Goal

Avoid each module gradually becoming its own visual language.

Create/reinforce a shared module composition contract using existing primitives wherever possible.

Target pattern:

1. **Module Header**
2. **Primary status / summary**
3. **Toolbar / local tabs / filters** when needed
4. **Main body**
5. **Optional contextual footer / primary CTA**

Shared concepts should reuse shared components for:

- tabs;
- filters;
- progress bars;
- requirement rows;
- empty states;
- primary/secondary/disabled actions;
- badges/statuses;
- section headings.

### Definition of done

- Major modules feel related without becoming visually identical.
- No screen-specific reimplementation of existing primitives.
- Spacing, headings, action hierarchy and disabled states are predictable.

---

## P1.3 — Dedicated Combat HUD readability audit

### Goal

Perform a focused audit before changing the Combat HUD.

Do **not** change combat gameplay as part of this UI task unless a separate game-design decision is validated.

Audit readability of existing information such as:

- player HP;
- enemy HP;
- current stage/block progression;
- boss/reinforced/trial state when applicable;
- 3 active skills;
- healing potion;
- cooldown readability;
- buffs/debuffs/status effects;
- reward/yield information;
- distinction between progression and farming states.

The core question:

> Can the player understand combat state and progression at a glance without pulling attention away from the world?

### Definition of done

First produce findings and proposed changes. Do not blindly restyle the HUD.

Any implementation must preserve:

- World First principle;
- 3 active skills + heal consumable contract;
- no mana/energy system;
- persistent combat visibility.

---

## P2.1 — Inventory / Bank / Equipment remaining polish

This area is already close to target.

Do **not** launch another redesign.

Only consider evidence-based polish such as:

- search if item volume genuinely warrants it;
- improved sorting/filtering only if current workflows become painful;
- better empty states;
- small clarity/accessibility fixes.

Any change must preserve the recently validated interaction/storage work documented in section 3.

---

## P2.2 — Tooltip system final polish

### Existing validated direction

The shared tooltip system should remain the single source of item tooltip presentation.

### Candidate polish

Test a small hover-intent delay (roughly 100-150 ms range) to reduce tooltip flicker when the cursor crosses dense inventories.

This value is **not yet validated** and must be tested in game before locking it.

Also audit:

- disabled-action explanations;
- stat explanations;
- consistency across Inventory / Bank / Character / Merchant / Craft / Loot;
- tooltip concision.

The UI Bible rule remains: essential information must not exist only inside a tooltip.

---

## P2.3 — Navigation as state map

Do not add more primary navigation buttons without a strong reason.

Current primary modules are intentionally limited:

- Character
- Inventory
- Masteries
- Island
- Merchant
- World

Use the Attention System to make navigation communicate state through concise badges/markers.

Examples are conceptual only:

- Inventory warning;
- Island actionable marker;
- Merchant/enchantment action;
- progression-related module attention.

Avoid unreadable counters everywhere.

---

## P3.1 — Masteries / Production cognitive-density pass

### Goal

Reduce permanent information density rather than add more panels/data.

Use progressive disclosure:

Always visible:

- current level/state;
- current progress;
- immediately useful bonus/action.

On demand:

- detailed formulas;
- breakdowns;
- secondary bonus provenance;
- advanced explanations.

Do not turn endgame systems into permanently visible spreadsheet tables unless the data is required for the player's immediate decision.

---

## P3.2 — PC responsive / smaller-resolution pass

Albion Idle is PC-focused, but the shell must remain usable on smaller desktop/laptop resolutions.

Audit at least:

- Right Panel width;
- bottom navigation overflow;
- Character layout;
- Inventory/Bank grids;
- equipment picker;
- tooltip placement;
- Combat HUD overlap;
- header density.

Prefer adapting shared tokens/layout rules over adding module-specific media-query patches.

---

## P4 — General visual redesign

**Not recommended at this stage.**

Only revisit if a later usability/visual audit identifies a systemic failure that cannot be solved through the roadmap above.

Do not spend large effort repainting the game while hierarchy, attention and interaction consistency still provide higher UX value.

---

# 6. Explicitly rejected directions for now

Unless the user explicitly revalidates them, do not introduce:

- full-screen Inventory / Character / Masteries pages;
- replacement of the global shell;
- second global sidebar navigation;
- excessive floating/modal windows;
- duplicated screen-specific tooltip systems;
- permanent walls of advanced stats;
- notification spam;
- UI-specific gameplay state duplicated outside authoritative runtime/domain data;
- cosmetic redesign before higher-priority UX work.

---

# 7. Recommended execution order

Follow this sequence unless a blocking bug changes priorities:

1. **P0.1 Attention System**
2. **P0.2 Interaction Contract audit + fixes**
3. **P1.1 Dashboard hierarchy**
4. **P1.2 Module hierarchy normalization**
5. **P1.3 Combat HUD dedicated audit**
6. **P2 targeted polish**
7. **P3 density + smaller-resolution pass**
8. **P4 only if later evidence justifies it**

Do not start multiple large UI architecture changes in parallel.

---

# 8. Process rules for the next agent/chat

Before implementation:

1. Read `AGENTS.md`.
2. Read the relevant UI Bible files.
3. Inspect the current branch, because this handoff baseline SHA may be outdated when resumed.
4. Reuse existing components/runtime data before creating new abstractions.
5. Keep the solution data-driven where appropriate.
6. Do not alter gameplay rules under the guise of UI work.
7. For each major phase: implementation -> targeted tests -> lint -> typecheck -> end-to-end UI review.
8. Challenge proposed changes that conflict with World First, readability, progressive disclosure or existing architecture.

---

# 9. First task when resuming

Start with **P0.1 Global Attention System**.

Before coding, audit existing sources for actionable states and existing notification/badge infrastructure.

Expected first deliverable:

- inventory of existing actionable states;
- which are derived vs persisted;
- where each state currently appears (Dashboard / module / notification / nowhere);
- proposed shared attention model;
- exact first implementation slice with minimal architecture impact.

Do not begin by creating badges directly inside every module.

---

# 10. Validation status

This roadmap and ordering were explicitly validated by the user on 2026-09-01.

The roadmap itself is the approved direction. Individual implementation details inside each phase still require normal audit and should be challenged when the existing project architecture indicates a better solution.
