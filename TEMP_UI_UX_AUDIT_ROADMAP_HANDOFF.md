# Albion Idle — UI/UX Audit Roadmap Handoff

Date: 2026-09-01
Branch: `agent/albion-idle-development`
Original roadmap baseline: `ff29672dee559107071f36389409296baf385555`
Implementation baseline after validated P1.2: `20322a9740134d6c243f782c55ba1c25af5a36a4`
Latest validated Combat HUD implementation: `b98876081473420431b6a9804a9d1772f4e8c38d`
Status: **P0.1 + P0.2 + P1.1 + P1.2 + P1.3 VALIDATED**

---

## 1. Purpose

This document is the authoritative handoff for the current UI/UX audit roadmap.

It is not a redesign brief. The current global shell remains structurally sound and must be preserved unless a later audit proves otherwise.

Objective: improve clarity, player guidance, consistency and moment-to-moment usability without introducing a parallel UI architecture.

Status legend used below:

- **TRAITÉ + IMPLÉMENTÉ** = point audité, changement validé et présent sur la branche active.
- **AUDITÉ / AUCUN CHANGEMENT** = point explicitement revu, mais aucun changement n’a été retenu.
- **À FAIRE** = point non encore traité dans la roadmap active.

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

## P0.1 — Global Attention System — DONE

Status: **TRAITÉ + IMPLÉMENTÉ**

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

Status: **TRAITÉ + IMPLÉMENTÉ**

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

Status: **TRAITÉ + IMPLÉMENTÉ**

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

Status: **TRAITÉ + IMPLÉMENTÉ**

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

## P1.3 — Dedicated Combat HUD readability — DONE

Status global: **TRAITÉ + IMPLÉMENTÉ / AUDITÉ selon les points ci-dessous**

Audit performed against the live branch and in-game screenshots. The Combat HUD architecture was preserved: Phaser remains authoritative for in-world combat presentation; React remains an overlay for contextual HUD/UI.

### P1.3.1 — Ability Bar

Status: **AUDITÉ / AUCUN CHANGEMENT**

Validated existing structure:

- 3 active abilities;
- healing potion;
- cooldown overlay + numeric cooldown;
- locked states;
- keyboard shortcuts;
- auto-cast control;
- data-driven ability content/tooltips.

No structural rework retained.

### P1.3.2 — Segment / encounter progression

Status: **AUDITÉ / AUCUN CHANGEMENT**

The existing top timeline + Dashboard Combat card already provide complementary information without needing another permanent HUD layer.

No duplicate `segment / encounter / progression-farm` readout was added in-world.

### P1.3.3 — Hero / Enemy HP readability

Status: **TRAITÉ + IMPLÉMENTÉ**

Targeted visual pass only:

- health bar slightly thickened;
- stronger border contrast;
- HP value readability slightly reinforced;
- actor label readability slightly reinforced.

The existing `world_hud` render manifest remains the source of truth; no parallel React health-bar system was created.

### P1.3.4 — Elite / Boss distinction

Status: **TRAITÉ + IMPLÉMENTÉ**

Initial attempt with a separate floating line above HP was rejected after in-game review because it crowded the HP block.

Final validated implementation:

- `ELITE` / `BOSS` rendered inline to the right of the enemy name;
- positioning is owned by the Phaser World HUD and uses the actual rendered enemy-name width;
- no badge on normal encounters;
- no vertical space is inserted between enemy name and HP value/bar;
- badge follows the actually presented encounter, including enemy-presentation transitions.

This final form was explicitly validated.

### P1.3.5 — Buffs / debuffs / status effects

Status: **AUDITÉ / AUCUN CHANGEMENT**

Current actor-anchored status-effect system is retained. It already follows Phaser HUD anchors and authoritative combat effects.

### P1.3.6 — Defeat state

Status: **AUDITÉ / AUCUN CHANGEMENT**

Current explicit recovery action (`Reprendre l’exploration`) remains valid.

### P1.3.7 — Activity Journal

Status: **AUDITÉ / AUCUN CHANGEMENT**

After in-game review, the journal was judged sufficiently compact and non-obstructive. No collapsing/repositioning was retained.

### P1.3.8 — Victory feedback

Status: **AUDITÉ / AUCUN CHANGEMENT**

The current `VICTOIRE` feedback was explicitly judged non-problematic and remains unchanged.

### P1.3 conclusion

Combat HUD is considered **closed for this roadmap pass**. No large redesign is justified by the current in-game result.

---

# 4. PREVIOUS VALIDATED WORK — DO NOT REGRESS

## Inventory / Bank / Equipment

Status: **TRAITÉ + IMPLÉMENTÉ** for the items listed below.

- Bank tabs are ranges of one shared Bank inventory, not separate storage owners.
- Drag item onto Bank tab -> move to first compatible destination.
- Right-click can move Bank items between tabs.
- Inventory right-click can move items directly to a Bank tab.
- Storage destination logic remains centralized in runtime.
- Compatible stack merge is considered before empty slots.
- Equipment/Bank/Inventory stay on the existing storage architecture.

## Relic handling

Status: **TRAITÉ + IMPLÉMENTÉ**

- Sanctuary/dungeon relic is consumed when the corresponding analysis research starts.
- Legacy saves with research already active/completed reconcile the orphaned physical relic.

## Enchantment item language

Status: **TRAITÉ + IMPLÉMENTÉ**

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

Status: **TRAITÉ + IMPLÉMENTÉ** for current placement/right-click behavior; final polish remains in P2.2.

- Shared tooltip content remains authoritative.
- Right-click suppresses the hover tooltip while contextual menu is open.
- Tooltip placement is adaptive and attempts not to cover the hovered item/inventory/equipment picker when another valid placement exists.

---

# 5. REMAINING ROADMAP

## P2.1 — Inventory / Bank / Equipment targeted polish

Status: **À FAIRE**

Validated implementation scope:

- centralize Inventory / Bank item categorization through one shared UI resolver derived from existing authoritative catalogs;
- add local visual feedback for near-full / full Inventory and Bank capacity without creating new runtime state;
- make `ItemGrid` accessibility guidance reflect the actual interaction contract of each context;
- no simple-click selection layer (hover tooltip already covers inspection);
- no additional empty-state treatment;
- no search / advanced Tier-Quality-Enchantment filters in this pass.

## P2.2 — Tooltip system final polish

Status: **À FAIRE**

Candidate scope:

- test hover-intent delay around 100–150 ms;
- audit disabled-action explanations;
- audit stat explanations;
- verify consistency across Inventory / Bank / Character / Merchant / Craft / Loot;
- keep essential information outside tooltip-only presentation.

## P2.3 — Navigation as state map

Status: **À FAIRE**

Attention System already provides the foundation. Audit whether remaining navigation state communication needs polish without adding more primary navigation buttons or noisy counters.

## P3.1 — Masteries / Production cognitive-density pass

Status: **À FAIRE**

Use progressive disclosure. Reduce permanent information density; do not create spreadsheet walls.

## P3.2 — PC smaller-resolution / responsive pass

Status: **À FAIRE**

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

Status: **NON PLANIFIÉ / NON RECOMMANDÉ À CE STADE**

Only reopen if later evidence demonstrates a systemic visual/usability failure that the targeted roadmap cannot solve.

---

# 6. EXECUTION ORDER FROM HERE

1. **P2 targeted polish**
2. **P3 density + smaller-resolution pass**
3. **P4 only if evidence later justifies it**

Do not start multiple large UI architecture changes in parallel.

---

# 7. Process rules for the next agent/chat

Before implementation:

1. Read `AGENTS.md`.
2. Read the relevant UI Bible files.
3. Inspect the current branch/HEAD; this document can become stale.
4. Reuse existing components/runtime data before creating abstractions.
5. Keep solutions data-driven where appropriate.
6. Do not alter gameplay rules under UI work without separate validation.
7. Per major phase: audit -> proposal -> validation when needed -> implementation -> targeted tests -> lint -> typecheck -> E2E UI review.
8. Challenge changes that conflict with World First, readability, progressive disclosure or current architecture.
9. **For every roadmap point, keep an explicit status in this document: `TRAITÉ + IMPLÉMENTÉ`, `AUDITÉ / AUCUN CHANGEMENT`, or `À FAIRE`.**

---

# 8. Validation status

Roadmap ordering was explicitly validated on 2026-09-01.

Validated completed phases:

- **P0.1 Global Attention System — TRAITÉ + IMPLÉMENTÉ**
- **P0.2 Interaction Contract — TRAITÉ + IMPLÉMENTÉ**
- **P1.1 Dashboard cockpit — TRAITÉ + IMPLÉMENTÉ**
- **P1.2 Internal module hierarchy — TRAITÉ + IMPLÉMENTÉ**
- **P1.3 Combat HUD readability — TRAITÉ + IMPLÉMENTÉ / AUDITÉ selon les sous-points**

Current resume point:

> **P2.1 — Inventory / Bank / Equipment targeted polish**
