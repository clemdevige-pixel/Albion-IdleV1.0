# Albion Idle — UI/UX Audit Roadmap Handoff

Date: 2026-09-01
Branch: `agent/albion-idle-development`
Original roadmap baseline: `ff29672dee559107071f36389409296baf385555`
Implementation baseline after validated P1.2: `20322a9740134d6c243f782c55ba1c25af5a36a4`
Status: **P0.1 + P0.2 + P1.1 + P1.2 VALIDATED — next phase: P1.3 Combat HUD audit**

---

## 1. Purpose

This document is the authoritative handoff for the current UI/UX audit roadmap.

It is not a redesign brief. The current global shell remains structurally sound and must be preserved unless a later audit proves otherwise.

Objective: improve clarity, player guidance, consistency and moment-to-moment usability without introducing a parallel UI architecture.

---

## 2. Non-negotiable UI principles

The existing UI Bible remains authoritative, especially:

- `UI_BIBLE/00_PRINCIPLES.txt`
- `UI_BIBLE/02_LAYOUT.txt`
- `UI_BIBLE/03_DESIGN_SYSTEM.txt`
- `UI_BIBLE/04_COMPONENT_LIBRARY.txt`
- `UI_BIBLE/07_RIGHT_PANEL.txt`
- `UI_BIBLE/17_TOOLTIPS.txt`

Rules to preserve:

1. Single-screen experience.
2. Game World remains visible and visually central.
3. Features integrate into the contextual Right Panel.
4. Reuse shared components and existing runtime/domain sources.
5. Readability before decoration.
6. Progressive disclosure: essential information visible, detail on demand.
7. No unnecessary layout shifts or parallel interaction systems.
8. UI-specific state must not duplicate authoritative gameplay/runtime state.

Shell contract:

`Header -> Game World + Right Panel -> Bottom Navigation`

Do not introduce a global sidebar, fullscreen module pages, excessive floating windows or a second navigation system without explicit revalidation.

---

# 3. COMPLETED + VALIDATED

## P0.1 — Global Attention System — DONE

A shared/data-driven attention layer now drives Dashboard/navigation attention instead of independent module-specific detection.

Validated behavior includes:

- inventory capacity warnings;
- worker idle/paused attention;
- persistent `no expedition active` attention once expeditions are available;
- enchantment-ready attention with per-item dismissal behavior;
- one-shot feature unlock attention derived from real research unlocks;
- parent-module badge + local sub-feature badge for relevant unlocks;
- feature acknowledgement only when the actual destination is visited where possible;
- yield-tracking unlock acknowledged on first real favorite/unfavorite action, not on opening the screen;
- acknowledgements persisted through the existing Dashboard UI save provider rather than a parallel local-storage system.

Major unlock destinations covered include:

- Expeditions / faction expeditions / second expedition slot;
- Enchantment;
- Black Market;
- resource yield tracking;
- advanced Bank management;
- worker organization;
- instant refining;
- Dungeons + faction rune world drop;
- Tower.

Do not regress this into independent per-screen badge logic.

---

## P0.2 — Interaction Contract — DONE

Validated interaction grammar:

- click -> select / inspect;
- double-click -> primary/default action where relevant;
- right-click -> contextual actions;
- drag & drop -> move / organize where spatial movement exists;
- hover -> information.

Important validated cases:

- Inventory / Bank item movement and contextual actions;
- Character equipped-item right-click -> unequip action;
- Character equipment picker closes with Escape and outside click;
- Merchant / Masteries / Island / World audited and not forced into artificial right-click/double-click behavior when it adds no value.

---

## P1.1 — Dashboard cockpit — DONE

The existing modular/reorderable Dashboard architecture was preserved.

Current hierarchy:

1. **Priorités**
2. **Activité en cours**
3. **Rendement & suivi**

Validated details:

- `Priorités` consumes the shared attention source;
- direct CTA/deep-links open the real destination where supported;
- Expedition idle -> `Île > Académie > Expéditions`;
- worker attention -> relevant gathering building, with Worker House fallback;
- Enchantment / Black Market / Bank / Resources / Dungeons / Tower deep-links supported;
- Black Market cargo transit is shown in **Activité en cours** with progress/ETA and direct CTA;
- active research/expeditions are separated from unresolved priorities;
- Production belongs to **Rendement & suivi**;
- Production card displays active workers by resource family: up to 4 resource rows x 2 workers;
- one worker in a family uses the full row width; two workers use 50/50;
- all 8 currently supported active workers can be visible simultaneously;
- non-worker production activities remain separated below when relevant;
- the attempted extra compaction of Rendement/Production was reverted; the earlier validated spacing remains;
- saved Dashboard section order remains authoritative within its groups.

---

## P1.2 — Internal module hierarchy — DONE

No global `ModuleLayout` wrapper was introduced because the existing architecture was already sufficiently coherent.

Validated targeted fixes:

- Character: redundant `Équipement` internal heading removed;
- Merchant: tab semantics normalized (`tablist` / `tab` / selected state);
- World: same semantic tab normalization;
- Masteries: real 3-category grid corrected from 2 columns to 3;
- Island overview: redundant `Île du joueur` pre-title removed; summary starts directly with level/status;
- Academy: main tabs visually aligned with other modules; hover/focus/disabled/empty states normalized;
- Worker House / Refining / Crafting audited and intentionally left structurally unchanged because their hierarchy/disabled states were already coherent.

Principle confirmed: standardize shared grammar, not every screen's shape.

---

# 4. PREVIOUS VALIDATED WORK — DO NOT REGRESS

## Inventory / Bank / Equipment

- Bank tabs are ranges of one shared Bank inventory, not separate storage owners.
- Drag item onto Bank tab -> move to first compatible destination.
- Right-click can move Bank items between tabs.
- Inventory right-click can move items directly to a Bank tab.
- Storage destination logic remains centralized in runtime.
- Compatible stack merge is considered before empty slots.
- Equipment/Bank/Inventory stay on the existing storage architecture.

## Relic handling

- Sanctuary/dungeon relic is consumed when the corresponding analysis research starts.
- Legacy saves with research already active/completed reconcile the orphaned physical relic.

## Enchantment item language

Color contract:

- `.0` grey
- `.1` green
- `.2` blue
- `.3` purple
- `.4` yellow

Placement:

- item slot: `Tn.x` bottom-left, enchantment diamonds bottom-right when compatible with quantity;
- tooltip: diamonds on the item title line;
- equipment slots follow the same item-scale language as inventory slots.

## Tooltips

- Shared tooltip content remains authoritative.
- Right-click suppresses the hover tooltip while contextual menu is open.
- Tooltip placement is adaptive and attempts not to cover the hovered item/inventory/equipment picker when another valid placement exists.

---

# 5. NEXT PHASE

## P1.3 — Dedicated Combat HUD readability audit — NEXT

### Goal

Audit before changing anything. Do not blindly restyle the Combat HUD and do not alter combat gameplay under the guise of UI work.

Audit at minimum:

- player HP;
- enemy HP;
- stage/block progression;
- boss/reinforced/trial state where applicable;
- 3 active skills;
- healing potion;
- cooldown readability;
- buffs/debuffs/status effects;
- reward/yield information;
- distinction between progression and farming states;
- overlap/density against the World First principle.

Core question:

> Can the player understand combat state and progression at a glance without pulling attention away from the world?

### Required first deliverable

Findings + ranked proposals only. Implementation comes after explicit validation of the proposed HUD changes.

Must preserve:

- World First principle;
- 3 active skills + heal consumable;
- no mana/energy system;
- persistent combat visibility.

---

# 6. REMAINING ROADMAP AFTER P1.3

## P2.1 — Inventory / Bank / Equipment targeted polish

Already close to target. No redesign.

Only evidence-based improvements, e.g. search/sorting/filter clarity/empty states/accessibility if real usage proves a need.

## P2.2 — Tooltip system final polish

Candidate only, not validated yet:

- test hover-intent delay around 100–150 ms;
- audit disabled-action explanations;
- audit stat explanations;
- verify consistency across Inventory / Bank / Character / Merchant / Craft / Loot;
- keep essential information outside tooltip-only presentation.

## P2.3 — Navigation as state map

Attention System already provides the foundation. Audit whether remaining navigation state communication needs polish without adding more primary navigation buttons or noisy counters.

## P3.1 — Masteries / Production cognitive-density pass

Use progressive disclosure. Reduce permanent information density; do not create spreadsheet walls.

## P3.2 — PC smaller-resolution / responsive pass

Audit at least:

- Right Panel width;
- bottom navigation overflow;
- Character layout;
- Inventory/Bank grids;
- equipment picker;
- tooltip placement;
- Combat HUD overlap;
- header density.

Prefer shared tokens/layout rules over module-specific media-query accumulation.

## P4 — General visual redesign

Still **not recommended** unless later evidence demonstrates a systemic visual/usability failure that the targeted roadmap cannot solve.

---

# 7. EXECUTION ORDER FROM HERE

1. **P1.3 Combat HUD audit**
2. **P2 targeted polish**
3. **P3 density + smaller-resolution pass**
4. **P4 only if evidence later justifies it**

Do not start multiple large UI architecture changes in parallel.

---

# 8. Process rules for the next agent/chat

Before implementation:

1. Read `AGENTS.md`.
2. Read the relevant UI Bible files.
3. Inspect the current branch/HEAD; this document can become stale.
4. Reuse existing components/runtime data before creating abstractions.
5. Keep solutions data-driven where appropriate.
6. Do not alter gameplay rules under UI work without separate validation.
7. Per major phase: audit -> proposal -> validation when needed -> implementation -> targeted tests -> lint -> typecheck -> E2E UI review.
8. Challenge changes that conflict with World First, readability, progressive disclosure or current architecture.

---

# 9. Validation status

Roadmap ordering was explicitly validated on 2026-09-01.

Validated completed phases:

- **P0.1 Global Attention System**
- **P0.2 Interaction Contract**
- **P1.1 Dashboard cockpit**
- **P1.2 Internal module hierarchy**

Current resume point:

> **P1.3 — Dedicated Combat HUD readability audit**
