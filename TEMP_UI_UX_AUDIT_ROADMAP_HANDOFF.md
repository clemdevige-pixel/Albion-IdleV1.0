# Albion Idle — UI/UX Audit Roadmap Handoff

Date: 2026-09-01
Branch: `agent/albion-idle-development`
Original roadmap baseline: `ff29672dee559107071f36389409296baf385555`
Implementation baseline after validated P1.2: `20322a9740134d6c243f782c55ba1c25af5a36a4`
Latest validated Combat HUD implementation: `b98876081473420431b6a9804a9d1772f4e8c38d`
Latest validated roadmap implementation before closure doc: `24e7d1a37c58243abdf2b5be4d12a88d906a5b3f`
Status: **P0.1 -> P3.2 VALIDATED / GLOBAL UI-UX PASS CLOSED**

---

## 1. Purpose

This document is the authoritative handoff for the completed global UI/UX audit roadmap.

It is not a redesign brief. The current global shell remains structurally sound and was intentionally preserved throughout the roadmap.

Objective achieved: improve clarity, player guidance, consistency and moment-to-moment usability without introducing a parallel UI architecture.

Status legend:

- **TRAITÉ + IMPLÉMENTÉ** = point audité, changement validé et présent sur la branche active.
- **AUDITÉ / AUCUN CHANGEMENT** = point explicitement revu, mais aucun changement n’a été retenu.
- **NON PLANIFIÉ / NON RECOMMANDÉ** = ne pas lancer sans nouvel élément démontrant un besoin systémique.

---

## 2. Non-negotiable UI principles

The existing UI Bible remains authoritative, especially:

- `UI_BIBLE/00_PRINCIPLES.txt`
- `UI_BIBLE/02_LAYOUT.txt`
- `UI_BIBLE/03_DESIGN_SYSTEM.txt`
- `UI_BIBLE/04_COMPONENT_LIBRARY.txt`
- `UI_BIBLE/07_RIGHT_PANEL.txt`
- `UI_BIBLE/17_TOOLTIPS.txt`
- `UI_BIBLE/23_COMBAT_HUD.txt`

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

## P0.1 — Global Attention System

Status: **TRAITÉ + IMPLÉMENTÉ**

Shared/data-driven attention layer drives Dashboard/navigation attention instead of independent module-specific detection.

Validated coverage includes inventory capacity warnings, worker idle/paused attention, persistent no-expedition attention, enchantment-ready attention with dismissal, real research unlock attention, parent/local badges, destination-aware acknowledgement and persistence through the existing Dashboard UI save provider.

Do not regress this into independent per-screen badge logic.

---

## P0.2 — Interaction Contract

Status: **TRAITÉ + IMPLÉMENTÉ**

Validated interaction grammar:

- click -> select / inspect where relevant;
- double-click -> primary/default action where relevant;
- right-click -> contextual actions;
- drag & drop -> move / organize where spatial movement exists;
- hover -> information.

Inventory, Bank, Character, Merchant, Masteries, Island and World were audited against this contract. Artificial interactions were explicitly avoided when they added no value.

---

## P1.1 — Dashboard cockpit

Status: **TRAITÉ + IMPLÉMENTÉ**

Existing modular/reorderable Dashboard architecture preserved.

Validated hierarchy:

1. Priorités
2. Activité en cours
3. Rendement & suivi

Shared Attention System feeds priorities; deep-links open real destinations; active research/expeditions remain separated from unresolved priorities; Production remains in Rendement & suivi; worker rows support the validated current capacity without hiding active workers.

---

## P1.2 — Internal module hierarchy

Status: **TRAITÉ + IMPLÉMENTÉ**

No global `ModuleLayout` wrapper was introduced because the existing architecture was already sufficiently coherent.

Targeted fixes included Character heading cleanup, Merchant/World tab semantics, Masteries category grid correction, Island overview cleanup and Academy tab/state normalization.

Principle confirmed: standardize shared grammar, not every screen's shape.

---

## P1.3 — Dedicated Combat HUD readability

Status: **TRAITÉ + IMPLÉMENTÉ / AUDITÉ selon sous-points**

Combat HUD architecture preserved: Phaser remains authoritative for in-world combat presentation; React remains overlay/contextual UI.

Validated changes:

- hero/enemy HP readability reinforced;
- Elite/Boss distinction rendered inline with enemy name.

Audited and intentionally unchanged:

- ability bar;
- segment/encounter progression;
- buffs/debuffs/status effects;
- defeat state;
- Activity Journal;
- victory feedback.

Combat HUD is closed for this roadmap pass.

---

## P2.1 — Inventory / Bank / Equipment targeted polish

Status: **TRAITÉ + IMPLÉMENTÉ**

Validated implementation:

- Inventory / Bank categorization centralized through one shared UI resolver derived from existing catalogs;
- near-full / full capacity feedback added without new runtime state, using the existing capacity contract;
- `ItemGrid` accessibility guidance now reflects actual context actions;
- no simple-click selection layer;
- no additional empty-state treatment;
- no search or advanced Tier/Quality/Enchantment filters added.

---

## P2.2 — Tooltip final polish

Status: **TRAITÉ + IMPLÉMENTÉ**

Validated implementation:

- centralized hover-intent delay around 120 ms for item hover tooltips;
- pending tooltip cancelled immediately on leave/right-click;
- technical `IP/2M` wording replaced by player-facing language without changing calculations;
- Character Item Power receives a short explanatory tooltip via the existing shared tooltip component;
- no tooltip proliferation on obvious stats.

Disabled-action handling and cross-module tooltip consistency were audited; no larger system rewrite was justified.

---

## P2.3 — Navigation as state map

Status: **TRAITÉ + IMPLÉMENTÉ**

Validated implementation:

- Merchant meaningful sub-views synchronize `activeView` (`buy`, `repair`, `enchant`, `black_market`);
- Inventory meaningful sub-views synchronize `activeView` (`bank`, resource deep-link cleanup, inventory root);
- micro-states such as filters, bank tab selection or selected item remain local and are not promoted into navigation state;
- no new router, breadcrumb or navigation system introduced.

Result: deep-links remain replayable and navigation state matches the actually displayed meaningful sub-view.

---

## P3.1 — Masteries / Production cognitive-density

Status: **TRAITÉ + IMPLÉMENTÉ**

Validated final implementation:

- child weapon masteries keep name, level and XP progression visible;
- a single `i` control opens all secondary detail for weapon specializations: bonuses + abilities/details;
- gathering child masteries follow the same single-`i` pattern for secondary detail;
- low-value mastery detail such as `1 ressource par cycle` and worker cycle-time presentation was removed from the Masteries detail surface;
- gathering progression detail now exposes the next resource unlock / Tier / required mastery level derived from `GATHERING_MASTERY_UNLOCK_BY_TIER` and the existing production catalog;
- Crafting was audited and intentionally left unchanged.

Do not reintroduce separate `Bonus` and `i` controls for the same mastery row.

---

## P3.2 — PC smaller-resolution / responsive pass

Status: **TRAITÉ + IMPLÉMENTÉ**

Validated implementation:

- Bottom Navigation can scroll horizontally below 1100 px only when required, preventing clipped/inaccessible modules;
- Character gains an additional narrow-PC breakpoint around 920 px with smaller slots/gaps while preserving left / hero / right structure;
- Gathering narrows fixed cycle / active-strike columns at the same narrow-PC breakpoint;
- Inventory/Bank, Merchant and Masteries existing responsive behavior was audited and retained;
- no mobile-first redesign or global font scaling introduced.

---

# 4. PREVIOUS VALIDATED WORK — DO NOT REGRESS

## Inventory / Bank / Equipment

- Bank tabs remain ranges of one shared Bank inventory, not separate storage owners.
- Drag/right-click storage movements remain on centralized runtime destination logic.
- Compatible stack merge remains considered before empty slots.
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
- Right-click suppresses hover tooltip while contextual menu is open.
- Tooltip placement remains adaptive and attempts not to cover the hovered item/inventory/equipment picker when another valid placement exists.

---

# 5. FINAL CROSS-ROADMAP AUDIT

Status: **AUDITÉ / AUCUN CHANGEMENT SUPPLÉMENTAIRE RETENU**

A final transversal review was performed after P0 -> P3.

No new systemic UI/UX issue was identified that justifies another targeted phase or a general redesign.

The final state remains coherent with the validated direction:

- one shell architecture;
- World-first composition preserved;
- Right Panel remains contextual;
- Attention, interaction, tooltip and navigation contracts remain shared rather than duplicated;
- progressive disclosure is used where density was proven problematic;
- smaller-PC hardening is targeted rather than mobile-driven;
- no parallel gameplay/runtime state introduced by UI work.

Any future UI change should therefore start from a newly observed player problem, screenshot, telemetry issue or explicit gameplay requirement rather than reopening this roadmap by default.

---

# 6. P4 — General visual redesign

Status: **NON PLANIFIÉ / NON RECOMMANDÉ À CE STADE**

The P0 -> P3 roadmap solved the identified issues without evidence of a systemic shell/design failure.

Do not start P4 unless new evidence demonstrates that targeted fixes can no longer solve the problem.

---

# 7. Process rules for future UI work

Before implementation:

1. Read `AGENTS.md`.
2. Read the relevant UI Bible files.
3. Inspect the current branch/HEAD; this document can become stale.
4. Reuse existing components/runtime data before creating abstractions.
5. Keep solutions data-driven where appropriate.
6. Do not alter gameplay rules under UI work without separate validation.
7. For any new significant UI issue: audit -> proposal -> validation -> implementation -> targeted tests -> lint -> typecheck -> in-game review.
8. Challenge changes that conflict with World First, readability, progressive disclosure or current architecture.

---

# 8. Validation status / resume point

Validated completed phases:

- **P0.1 Global Attention System — TRAITÉ + IMPLÉMENTÉ**
- **P0.2 Interaction Contract — TRAITÉ + IMPLÉMENTÉ**
- **P1.1 Dashboard cockpit — TRAITÉ + IMPLÉMENTÉ**
- **P1.2 Internal module hierarchy — TRAITÉ + IMPLÉMENTÉ**
- **P1.3 Combat HUD readability — TRAITÉ + IMPLÉMENTÉ / AUDITÉ selon les sous-points**
- **P2.1 Inventory / Bank / Equipment targeted polish — TRAITÉ + IMPLÉMENTÉ**
- **P2.2 Tooltip final polish — TRAITÉ + IMPLÉMENTÉ**
- **P2.3 Navigation as state map — TRAITÉ + IMPLÉMENTÉ**
- **P3.1 Masteries / Production cognitive-density — TRAITÉ + IMPLÉMENTÉ**
- **P3.2 PC smaller-resolution / responsive — TRAITÉ + IMPLÉMENTÉ**
- **Final transversal audit — AUDITÉ / AUCUN CHANGEMENT SUPPLÉMENTAIRE RETENU**

Current resume point:

> **Global UI/UX roadmap closed. Do not start P4 by default. Resume from a new concrete player/UI problem when one is observed.**
