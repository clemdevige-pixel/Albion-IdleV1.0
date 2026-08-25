# TEMP — P9.1 BLUE ONBOARDING HANDOFF

> **TEMPORARY HANDOFF — DELETE THIS FILE WHEN P9.1 IS FULLY IMPLEMENTED AND VALIDATED.**
>
> This file exists only to let the next agent/chat resume P9.1 without losing decisions from the previous discussion. Once the onboarding implementation, tests, manual validation and final documentation are complete, **delete this file in the same closing block/commit**. Do not keep it as permanent project documentation.

## 0. Repository / branch / current state

- Repository: `clemdevige-pixel/Albion-IdleV1.0`
- Active branch: `agent/albion-idle-development`
- Last validated work immediately before P9.1: restoration of the **Inventory + Bank accessible-storage contract**, including loot/rewards, stacking, crafting, consumables, vendor, repair, enchantment, loadouts and manual equipment selection from bank.
- The final enchantment bank-shard fix was committed at `7b9270ac919b8006288dc8be05d4470bf8b7d7f9` and the user confirmed **all automated tests green + manual enchantment test OK**.
- P9.1 implementation has **not** been completed yet. Previous chat only audited the current onboarding architecture and agreed the design contract below.

## 1. P9 context

P9 is a Game Director / UX audit of the real T3→T8 player loop. The first high-priority result was:

**P9.1 — improve new-player guidance.**

Important correction made during design: P9.1 is **not** a permanent “next goal” system covering the whole game. It is a **short onboarding guide covering the Blue Zone**, ending after the player has understood the first dungeon/artifact loop.

## 2. Non-negotiable product contract

The onboarding is **100% non-blocking**.

It must NEVER:

- gate gameplay actions;
- lock buttons, zones, buildings, research or systems;
- require the player to follow the suggested order;
- create an alternate progression authority;
- require completion of tutorial-specific flags before normal unlocks happen;
- force the player to backtrack and perform an obsolete tutorial action.

Correct mental model:

```text
Canonical persisted game state
→ derive which pedagogical milestone is still relevant
→ show a lightweight suggestion
→ player remains completely free to ignore it
```

If the player has already completed later milestones, the guide must skip obsolete earlier steps and resolve to the first still-relevant pedagogical objective.

**Gameplay/runtime unlocks remain the only authorities. The tutorial must never become one.**

## 3. Persistence / architecture contract

Preferred implementation:

- derive onboarding state from **existing persisted authoritative state**;
- avoid volatile “tutorial step = X” state;
- avoid a parallel tutorial save-provider if the same facts can be inferred from game state;
- no duplicated business rules;
- data-driven milestone definitions where practical;
- presentation layer resolves a current milestone from canonical state/services;
- tutorial code must not be imported by gameplay packages or become a gameplay dependency.

The existing `IslandOnboardingGuide.tsx` already follows part of this philosophy: it derives its current early steps from island/workers/crafting/equipment/inventory/bank state and uses no tutorial flag.

## 4. Existing implementation to replace/extend

Current file:

`apps/client/src/ui/island/IslandOnboardingGuide.tsx`

Current behavior:

1. build one gathering building;
2. recruit a worker;
3. launch worker / gather / refine / build workshop;
4. craft first T3 gear;
5. guide disappears as soon as it detects a first armor/offhand item.

Important current code details:

- `GATHERING_BUILDING_IDS` already exists;
- current guide reads `island`, `crafting`, `workers`, `equipment`, `inventory`, `bank` from the bridge;
- it currently treats multiple armor/offhand slots as completion via `FIRST_GEAR_SLOTS`;
- current product decision changes this: the key equipment milestone should specifically be **crafting the T3 chest armor**, because chest armor is considered the centerpiece of the early equipment set.

Do NOT simply bolt a second unrelated guide onto this component. Prefer extracting a reusable onboarding resolver/catalog and let UI render the resolved milestone.

## 5. Validated onboarding scope / milestone sequence

The exact wording can be polished during implementation, but the pedagogical sequence is validated as follows.

### Phase A — strongly guided: learn production and first gear

#### Milestone 1 — Build a first gathering line

Teach:
- the island supports gear progression;
- choose a gathering building matching useful recipe materials.

Suggested intent:
`Construisez un premier bâtiment de récolte adapté aux matériaux dont vous avez besoin.`

Completion should derive from an existing gathering building being built.

#### Milestone 2 — Recruit and start a worker

Teach:
- worker = passive production;
- active hero gathering can complement it.

Completion should derive from worker state, not a tutorial flag.

#### Milestone 3 — Refine first resources / build Workshop

Teach:
- raw resource → refining → crafting;
- workshop is the crafting point.

The current guide combines parts of this already. Keep the experience light; no blocking checklist.

#### Milestone 4 — Craft the T3 chest armor

**Validated correction:** do NOT use “any first equipment piece”.

The objective should specifically introduce the **T3 chest armor** as the centerpiece of the first equipment set.

Do not require a full T3 set.

The milestone must be considered satisfied if the player already owns/equips a later equivalent that makes the T3 chest instruction obsolete. The resolver should be adaptive, not force a regression to T3.

### Phase B — lighter guidance: learn World progression

#### Milestone 5 — Progress through the Blue Zone

Teach:
- `Progression` vs `Farm`;
- advancing segments/zones versus returning to farm unlocked content.

Do not micromanage every segment.

The guide should become lighter here. The player should start acting autonomously.

### Phase C — introduce Academy through Enchantment

#### Milestone 6 — Discover / start the Enchantment research

The user explicitly requested a mini-guide on enchantment because it naturally introduces both:
- the Academy;
- the Enchantment system.

Current canonical research data:

`RESEARCH_IDS.enchantmentStudy`

Presentation currently states:
- studies enchantment shards discovered in the world;
- unlocks Merchant > Enchant;
- unlocks use of enchantment shards;
- currently `hiddenWhileLocked: true`.

Important validated rule:

**The onboarding does NOT require the player to perform an actual enchantment.**

The pedagogical step is complete once the research has been completed and the Enchant service is unlocked/opened by canonical progression.

The guide may explain what enchantment is, but must not force spending shards/silver.

### Phase D — Blue-zone autonomy until Frostpeak

#### Milestone 7 — Continue Blue progression to Frostpeak

Use a broad objective such as:
`Continuez votre progression dans la Zone Bleue jusqu'à Frostpeak.`

Do not list every intermediate zone/segment.

### Phase E — Relic → Academy → Dungeons

#### Milestone 8 — Discover the charged Relic at Frostpeak

Canonical progression already contains a charged Relic discovery at Frostpeak Mountain. Do not invent a separate tutorial relic state.

Once discovered, guide the player toward the Academy.

#### Milestone 9 — Research the Relic

Canonical research:

`RESEARCH_IDS.dungeonRelicAnalysis`

Current presentation:
- analyses the charged Relic found at Frostpeak Mountain;
- reveals `Localisation des Sanctuaires`.

#### Milestone 10 — Localise Sanctuaries / unlock Dungeons

Canonical research:

`RESEARCH_IDS.dungeonSanctuaryLocation`

Current presentation says it unlocks:
- `World > Donjons`;
- key fragments;
- complete key drops;
- rare faction rune drops in the world.

Tutorial must point at this canonical research chain, not duplicate its unlock condition.

### Phase F — first dungeon

#### Milestone 11 — Enter the first T4 dungeon

Teach the player where the Dungeons view is and that access depends on the existing dungeon/key rules.

Do not bypass or override dungeon access rules.

#### Milestone 12 — Clear the first T4 dungeon

Clear is detected from existing dungeon progression (`clearedTiers` / canonical dungeon runtime state).

Important design update: **the tutorial does NOT end immediately at this clear anymore.**

### Phase G — final mini-arc: Artifacts / Artifact weapons

#### Milestone 13 — Explain Artifacts / fragments

After first T4 dungeon clear, introduce:
- artifact drops/fragments from dungeon progression;
- their purpose in equipment progression.

This should be explanatory, not a forced grind objective.

#### Milestone 14 — Introduce Artifact weapons

Teach:
- Artifact weapons are a special crafting branch using artifacts;
- difference versus conventional weapons at a high level;
- where the player can inspect/craft them using the existing crafting UI.

**Do NOT require crafting an Artifact weapon.**

Reason: requiring a craft could create an arbitrary grind depending on drops/resources and would make the tutorial blocking in practice.

After the player has been introduced to Artifacts / Artifact weapons, onboarding is finished.

## 6. End-of-onboarding behavior

Desired endpoint:

The player has learned:

```text
production
→ refining
→ crafting / chest armor
→ world progression & farming
→ Academy via enchantment research
→ Frostpeak / Relic
→ dungeon research unlock chain
→ first T4 dungeon clear
→ artifacts / Artifact weapons
```

At this point the guide should disappear permanently *as a consequence of canonical progression being beyond the onboarding scope*, not because gameplay is gated behind a tutorial completion flag.

A future player already beyond this point when loading an old save should simply see no onboarding.

## 7. UI behavior / placement direction

The current onboarding only appears inside the Island overview. That is insufficient for a Blue-zone guide spanning World, Academy, Merchant and Dungeons.

Recommended direction:

- create one **global lightweight onboarding guidance component** rendered from `AppShell` or another shell-level presentation location;
- it should be visible without hijacking the right panel;
- it should remain compact and non-modal;
- no fullscreen overlays;
- no mandatory CTA;
- no automatic navigation unless the user explicitly clicks a voluntary shortcut;
- do not cover combat controls;
- preserve current Albion Idle UI language/style.

The existing island onboarding can either:
- become a presentation of the same global resolved milestone while the Island is open, or preferably
- be replaced by the new shared/global component to avoid two competing guides.

Do not create duplicated onboarding authorities.

## 8. Suggested implementation architecture

Names are suggestions; preserve current project architecture if a better existing home is found.

### A. Data / presentation catalog

Create something like:

`apps/client/src/data/onboardingContentCatalog.ts`

Containing immutable presentation metadata only, e.g.:

```ts
type OnboardingMilestoneId =
  | "build_gathering"
  | "recruit_worker"
  | "refine_and_workshop"
  | "craft_t3_chest"
  | "blue_progression"
  | "enchantment_research"
  | "reach_frostpeak"
  | "discover_relic"
  | "research_relic"
  | "unlock_dungeons"
  | "enter_t4_dungeon"
  | "clear_t4_dungeon"
  | "introduce_artifacts"
  | "introduce_artifact_weapons";
```

Metadata can include:
- title;
- concise description;
- optional module hint (`island`, `world`, `merchant`, etc.);
- optional tone/phase metadata.

Do NOT put gameplay unlock logic in this catalog.

### B. Resolver

Create a pure resolver/selectable presentation model, e.g.:

`apps/client/src/ui/onboarding/onboardingResolver.ts`

It should consume a structural state snapshot and return:

```ts
OnboardingGuidance | null
```

with the first still-relevant milestone.

The resolver must skip completed/obsolete milestones automatically.

Use existing state/services wherever possible:

- bridge island/buildings;
- bridge workers;
- crafting state;
- equipment + inventory + bank;
- world zone/progression;
- `getAcademyModel()` research states;
- `getRelicProgress(...)` if needed;
- `isDungeonSystemUnlocked()`;
- `getDungeonState().clearedTiers`;
- existing item/content catalogs for chest armor / Artifact weapon classification.

If one canonical fact is not presently projected into React state, expose the minimum read-only presentation selector/service needed. Do not create tutorial-specific persistence merely to solve it.

### C. UI component

Create a compact component, e.g.:

`apps/client/src/ui/onboarding/OnboardingGuide.tsx`

Mount globally from `AppShell`.

It should render:
- small eyebrow e.g. `Premiers pas`;
- milestone title;
- 1–2 sentence guidance;
- optional non-blocking navigation hint/action only if current navigation architecture supports it cleanly.

No modal/backdrop.

### D. Existing IslandOnboardingGuide

Once the global guide is active, remove or retire `IslandOnboardingGuide.tsx` if it would duplicate the same information.

Do not leave two independent onboarding systems.

## 9. Canonical IDs / facts already verified in previous chat

Research IDs are exported from:

`apps/client/src/data/researchContentCatalog.ts`

Important IDs:

- `RESEARCH_IDS.enchantmentStudy`
- `RESEARCH_IDS.dungeonRelicAnalysis`
- `RESEARCH_IDS.dungeonSanctuaryLocation`

`GameServices` already exposes:

- `getAcademyModel()`
- `getRelicProgress(relicId)`
- `isDungeonSystemUnlocked()`
- `getDungeonState()` with `clearedTiers`
- normal navigation/combat/world actions

Current global shell:

`apps/client/src/ui/shell/AppShell.tsx`

Current shell mounts:
- `HeaderRegion`
- world/island world region
- `RightPanelHost`
- `BottomBarRegion`
- `ResearchRecapOverlay`

This makes `AppShell` a natural candidate for a global non-modal onboarding component.

## 10. Tests required

Do not only snapshot-render the component. Test the **resolver contract**.

Minimum resolver tests should cover:

1. new player → first gathering milestone;
2. gathering built → worker milestone;
3. worker recruited/working → refining/workshop milestone;
4. T3 chest owned/equipped → early gear milestone skipped;
5. later-tier chest already owned → T3 chest milestone also skipped;
6. player farther into Blue → obsolete production milestones skipped;
7. enchantment research available/incomplete → enchantment milestone;
8. enchantment research completed → do not require a real enchant action;
9. Frostpeak/relic discovery progression resolves correctly;
10. relic analysis completed but sanctuary research incomplete → sanctuary milestone;
11. dungeon unlocked, no T4 clear → dungeon entry/clear guidance;
12. T4 cleared → artifact explanation milestone;
13. artifact/Artifact-weapon introduction considered past scope → resolver returns `null`.

Important: because final artifact introduction is pedagogical rather than a gameplay-gated action, implementation may need a **presentation acknowledgement** if there is genuinely no canonical state proving that the information was seen. If so, keep it explicitly UI-only and minimal. Do NOT make it a gameplay unlock. Prefer avoiding persistence if a natural canonical event/state can close it, but do not fake a canonical state that does not exist.

This is the one design point the next agent may need to decide carefully during implementation.

## 11. Documentation to produce after implementation

Once implementation is validated:

1. update the appropriate permanent AI Bible / UI or onboarding documentation with the final architecture and contract;
2. document that onboarding is non-authoritative and non-blocking;
3. document how future milestones may be added without adding gameplay gates;
4. record any deliberately UI-only acknowledgement used for the terminal artifact explanation;
5. **DELETE `TEMP_P9_1_BLUE_ONBOARDING_HANDOFF.md`.**

The temporary handoff must not become a second source of truth after the work is finished.

## 12. Validation commands

After implementation, from repository root:

```powershell
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test
pnpm.cmd build
```

Then manual smoke-test with at least:

- fresh/new save: early guidance changes correctly while freely ignoring it;
- an advanced Blue save: old milestones are skipped;
- enchantment research completes and onboarding advances without performing an enchantment;
- Frostpeak relic/research/dungeon sequence advances naturally;
- first T4 dungeon clear leads to artifact / Artifact weapon explanation;
- onboarding never blocks combat, navigation, production, research or dungeon actions;
- old save already past T4 dungeon/artifact introduction is not forced back through onboarding.

## 13. Immediate next action for the next agent

**Start by re-reading this temporary handoff + current `IslandOnboardingGuide.tsx`, `AppShell.tsx`, `GameServices.ts`, `researchContentCatalog.ts`, dungeon/relic presentation APIs.**

Then implement in this order:

1. pure/data-driven milestone catalog + resolver;
2. resolver tests;
3. global lightweight UI component;
4. shell integration;
5. retire old island-only duplicate guide;
6. automated validation;
7. manual smoke-test with user;
8. permanent documentation;
9. **delete this temporary handoff file.**

Do not restart the design discussion unless the current repo contradicts a fact in this handoff. The product decisions above are already validated by the user.
