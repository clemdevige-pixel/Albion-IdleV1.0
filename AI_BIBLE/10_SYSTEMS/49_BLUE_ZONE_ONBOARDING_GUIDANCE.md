# 49 — BLUE ZONE ONBOARDING GUIDANCE

## Purpose

The Blue Zone onboarding is a lightweight guidance layer for new players. It teaches the opening loop without becoming a quest system or a gameplay authority.

It covers the beginning of the game through the first T4 dungeon clear, then closes with an informational introduction to artifacts and artifact weapons.

## Non-blocking contract

The onboarding MUST NOT:

- gate gameplay actions, systems, zones, research, crafting or dungeons;
- become a prerequisite for any runtime unlock;
- force the player to execute objectives in the displayed order;
- award gameplay rewards;
- maintain a parallel progression state that disagrees with canonical runtime state.

The onboarding MUST:

- derive each objective from existing authoritative state whenever possible;
- skip objectives that are already satisfied;
- tolerate players progressing out of the suggested order;
- remain informational only;
- disappear once the teaching arc is complete.

The displayed objective is therefore a suggestion, not an instruction to the runtime.

## Milestone sequence

1. Build a first gathering production line.
   - Detection: at least one gathering building exists on the Island.

2. Recruit and start a first worker.
   - Detection: a worker is currently working or has already accumulated worker mastery XP.

3. Refine the first resources and establish the Workshop.
   - Detection: Workshop exists.
   - Rationale: Workshop construction is the durable canonical proxy proving the player has crossed the initial production/refining bridge. No transient “first refine” tutorial flag is required.

4. Craft the first T3 armor.
   - Detection: a conventional chest armor of T3 or above is owned in Equipment, Inventory or Bank.
   - A higher-tier armor also satisfies the milestone so an advanced/imported save is never asked to backtrack artificially.
   - Armor is intentionally used as the equipment milestone because it is the centerpiece of the early equipment set.

5. Continue Blue Zone progression until enchantment research is discovered.
   - Detection: `RESEARCH_IDS.enchantmentStudy` is no longer locked.
   - This phase introduces `Progression` versus optional `Farm` play without forcing either behavior.

6. Introduce Academy through enchantment research.
   - If Academy is not built yet, the guide introduces its construction first inside the same milestone.
   - Detection: `RESEARCH_IDS.enchantmentStudy` reaches completed state.
   - The player is NOT required to perform an actual enchantment. Completing the research and opening the merchant Enchanter service is sufficient.

7. Continue through the Blue Zone toward Frostpeak and discover the Charged Relic.
   - Detection: `RESEARCH_IDS.dungeonRelicAnalysis` becomes visible/unlocked.

8. Analyze the Charged Relic at the Academy.
   - Detection: `RESEARCH_IDS.dungeonRelicAnalysis` reaches completed state.

9. Complete Sanctuary Location and unlock Dungeons.
   - Detection: `RESEARCH_IDS.dungeonSanctuaryLocation` is completed and the canonical dungeon system reports unlocked.

10. Clear the first T4 Dungeon.
    - Detection: canonical dungeon cleared tiers contains T4.

11. Artifact / artifact weapon introduction.
    - Informational only.
    - Explains that dungeon faction fragments/artifacts feed artifact-weapon crafting.
    - Does NOT require crafting an artifact weapon.
    - The information can be acknowledged/dismissed; owning an artifact weapon also makes the teaching card unnecessary.

## Architecture

The implementation is presentation-only:

`canonical game state -> blueOnboardingModel resolver -> BlueOnboardingGuide UI`

The pure resolver lives in:

- `apps/client/src/ui/onboarding/blueOnboardingModel.ts`

The UI surface lives in:

- `apps/client/src/ui/onboarding/BlueOnboardingGuide.tsx`

The guide is rendered from the global right-panel host so it can remain useful while the player moves between World, Island, Merchant, Inventory and other early-game modules.

## State ownership

Canonical state remains owned by existing systems:

- Island buildings: Island runtime / bridge
- Workers: Worker runtime / bridge
- Crafting and owned equipment: Crafting + Inventory/Bank/Equipment
- Research: ResearchService via Academy presentation model
- Dungeon unlock and clears: Dungeon runtime/navigation

No tutorial flag is allowed to affect these systems.

The only dedicated onboarding state is the acknowledgement of the final artifact-information card. This is UI-only and stored locally under an account + save-slot scoped key. It has zero effect on gameplay and may safely be absent on another device; at worst the informational card is shown again.

## Future-agent rules

- Do not replace the resolver with a quest-state machine.
- Do not add gameplay unlocks conditioned on onboarding progress.
- Prefer durable canonical proxies over “first time X happened” flags.
- If a new onboarding milestone genuinely cannot be inferred from durable state, challenge whether the milestone is necessary before adding persistence.
- Keep the onboarding limited to the Blue Zone teaching arc. Do not extend it automatically through T5-T8 progression.
- The final artifact introduction is the end of the guide. Post-Blue systems should teach themselves through their own UI/unlocks.
