# 46 — BLACK MARKET SYSTEM

Status: DESIGN VALIDATED — IMPLEMENTATION DEFERRED

The Black Market is an endgame equipment sink designed to absorb long-term overproduction from gathering, refining and crafting while converting that production into Silver through a deliberate risk/reward loop.

This document defines the validated gameplay contract. It does not authorize implementation shortcuts or duplicated balance tables. Authored static balance belongs in `packages/data`; gameplay calculations, validation and state transitions belong in `packages/gameplay`; client presentation/orchestration belongs in `apps/client`.

---

## 1. DESIGN GOAL

Primary problem solved:

> Late-game gathering/refining/crafting can generate more materials and equipment than the player can meaningfully consume.

The Black Market converts that surplus into a meaningful endgame loop:

`surplus resources -> refining -> equipment craft -> Black Market cargo -> route risk -> total loss OR Silver payout`

The Black Market must:

- create a durable sink for crafted equipment;
- preserve gathering/refining/crafting as the source of the submitted value;
- create a high-stakes decision instead of a simple vendor sale;
- provide a repeatable Silver source whose expected value remains controlled;
- periodically create targeted production opportunities through special demands;
- preserve the usefulness/replayability of previously unlocked tiers.

The Black Market is NOT the normal Merchant and must be presented as a separate endgame system/module.

---

## 2. ACCESS / WORLD REPRESENTATION

The Black Market is represented as its own dedicated access point/building on the Player Island or equivalent dedicated hub module.

It must NOT be hidden as another tab of the normal Merchant.

Exact unlock condition: **TBD — deliberately not yet decided.**

Implementation must not invent an unlock requirement until this design decision is explicitly validated.

---

## 3. ACTIVE CONVOY LIMIT

Only **1 Black Market convoy may be active at a time** in V1.

No second slot, reputation progression, route upgrades or convoy-capacity progression are part of V1.

Once a convoy is confirmed:

- cargo is removed immediately from player-owned storage;
- the convoy cannot be cancelled;
- route/result/payout state is persisted;
- offline progression applies;
- the player learns success/failure only when the route duration completes.

---

## 4. CARGO CONTRACT

A cargo contains equipment only.

### Capacity

- **8 cargo slots**.
- Identical item references may stack in one cargo slot.
- **Maximum 5 units per cargo slot**.
- Maximum theoretical cargo size: **40 equipment units**.

Examples:

- `5 x Bow T7` = 1 cargo slot.
- `3 x Boots T7` = 1 cargo slot.
- `1 x Sword T6` = 1 cargo slot.
- A sixth identical unit requires no new slot: it is simply not allowed because the stack cap is 5.

Mixed tiers and mixed equipment families are allowed in the same cargo.

The 5-unit cap exists to prevent a single convoy from liquidating extremely large accumulated production stocks at once.

### Eligible equipment in V1

Accepted:

- standard crafted equipment;
- artifact equipment/weapons;
- enchanted equipment `.1`, `.2`, `.3`, `.4`.

Rejected in V1:

- Awakened equipment;
- currently equipped items.

Awakened items are intentionally excluded because their economic value includes trait/reroll investment that requires a separate valuation model.

---

## 5. ECONOMIC VALUE OF EQUIPMENT

The Black Market must NOT use a manually duplicated `item -> Silver price` table.

Equipment economic value is derived from the authoritative craft/enchantment contracts already used by the game.

### Base craft value

The economic value of an equipment item is the real economic value of everything consumed to produce it.

For sequential tier crafting, valuation is recursive:

`EquipmentValue(Tn) = CurrentTierMaterialValue + ConsumedPredecessorValue`

If the craft requires a T(n-1) predecessor, the predecessor's full economic value is included.

This means high-tier equipment naturally contains the accumulated value of the prior craft chain.

### Material values

Material economic values must derive from the canonical economy/balance contracts.

The validated pricing philosophy for raw production materials is based on opportunity cost:

`RawResourceValue = GatheringTimePerUnit x RelevantSilverPerHour`

Refined material value derives from the real authored refining chain and consumed inputs.

The Black Market must consume these canonical values/derivations rather than maintain its own synchronized material price table.

### Enchanted equipment

For `.1/.2/.3/.4`, equipment economic value includes the complete cumulative enchantment investment:

`EnchantedEquipmentValue = BaseCraftValue + ConsumedEnchantResourcesValue + ConsumedEnchantSilver`

This includes:

- all shards/resources consumed across every enchantment transition;
- all Silver consumed across every enchantment transition;
- any future authored resource added to the enchantment cost.

Example principle:

A `.3` item includes the complete `.0 -> .1 -> .2 -> .3` investment, not only the final transition.

No arbitrary `.1 = xN`, `.2 = xN`, etc. Black Market price multiplier is allowed.

---

## 6. NORMAL BLACK MARKET VALUE

Normal Black Market value is:

`NormalBMValue = EquipmentEconomicValue x 0.55`

The **55% base conversion rate** is intentional.

The Black Market is not supposed to reimburse the complete opportunity cost of production under normal conditions. Its baseline purpose is to provide a useful sink with controlled value destruction.

Special demands and route risk can then improve the payout.

---

## 7. ROUTES

The player chooses exactly one route when confirming a convoy.

| Route | Success chance | Success payout multiplier | Duration |
|---|---:|---:|---:|
| Route surveillée | 90% | x1.20 | 15 min |
| Route contestée | 70% | x1.75 | 30 min |
| Route interdite | 45% | x3.00 | 60 min |

### Failure

Failure means:

- **100% of the cargo is destroyed/lost**;
- payout = **0 Silver**;
- no item is returned.

There is no partial recovery in V1.

### Expected-value intent

Ignoring special demands, route expected values relative to the full economic value of the craft are approximately:

- Route surveillée: `0.55 x 1.20 x 0.90 = 59.4%`
- Route contestée: `0.55 x 1.75 x 0.70 = 67.375%`
- Route interdite: `0.55 x 3.00 x 0.45 = 74.25%`

Higher risk therefore has a higher expected return while preserving significant value destruction overall.

---

## 8. RESULT TIMING / ANTI-REROLL CONTRACT

The player must NOT know immediately whether the convoy succeeded.

At convoy confirmation:

- the success/failure outcome is resolved deterministically or otherwise fixed by the authoritative runtime;
- the result is persisted immediately;
- all payout inputs are persisted/frozen as required;
- the result is hidden from presentation until the route completes.

This prevents reload/reroll abuse while preserving suspense.

At route completion, the result is revealed and applied exactly once.

---

## 9. SPECIAL DEMANDS

Special demands coexist with the normal Black Market. They do not create a second sale/expedition system.

They are temporary modifiers applied to compatible cargo units submitted through the same convoy flow.

### Active demand count

- **3 active demands**.
- Global refresh every **24 hours at a fixed reset time**.
- All three refresh together.

### Demand target types

V1 supports:

- `weapon family + tier`
- `armor slot + tier`

Examples:

- Bows T7
- Daggers T6
- Boots T5
- Chest armor T8

No exact-item requirement is necessary in V1.

### Eligible tiers

All world tiers already unlocked by the player are eligible.

Eligible unlocked tiers are weighted **equally**.

Previously unlocked lower tiers remain fully relevant because tier replayability is an intentional part of Albion Idle.

No demand may target an unreached/unlocked future tier.

### Duplicate rules

- Exact duplicate `target + tier` demands are forbidden within the same rotation.
- Partial overlaps are allowed.

Examples:

Allowed:

- Bows T6
- Bows T7
- Boots T6

Forbidden:

- Bows T6
- Bows T6

---

## 10. SPECIAL DEMAND QUANTITIES

Demand quantity is tier-sensitive:

| Tier | Requested quantity range |
|---|---:|
| T4 | 5-8 |
| T5 | 4-7 |
| T6 | 3-6 |
| T7 | 2-5 |
| T8 | 1-4 |

Higher tiers request fewer items because each item represents substantially more accumulated production value.

---

## 11. SPECIAL DEMAND BONUS LEVELS

Demand bonus level is selected from the following authored distribution:

| Demand level | Black Market value bonus | Weight |
|---|---:|---:|
| Demand | +40% | 60% |
| Strong demand | +70% | 30% |
| Shortage | +100% | 10% |

The bonus applies only to compatible units still required by the demand.

Example:

Demand: `Bows T7 — 2 units remaining — +70%`.

Cargo contains `5 x Bow T7`.

- 2 units receive the +70% demand bonus;
- 3 units use normal Black Market value;
- the demand becomes complete at convoy departure.

---

## 12. WHEN DEMAND QUANTITY IS CONSUMED

Special-demand quantity is consumed **when the convoy departs**, not when it succeeds.

If a demand needs 5 units and the player submits 3 compatible units:

`0/5 -> 3/5 fulfilled`

This progress remains consumed even if the convoy later fails and all cargo is destroyed.

Rationale:

- the opportunity was committed when the cargo was mobilized;
- failed routes must not allow infinite retries against the same premium demand;
- this keeps special demands economically bounded.

---

## 13. FINAL PAYOUT FORMULA

Conceptually, payout is calculated per submitted unit and aggregated:

`CraftEconomicValue`
`-> x 0.55 Normal Black Market rate`
`-> x SpecialDemandModifier if applicable`
`-> x RouteSuccessPayoutMultiplier`

Only if the convoy succeeds is the resulting total paid in Silver.

If the convoy fails:

`FinalPayout = 0`

Special-demand bonuses apply only to the number of still-requested matching units. Additional matching units use normal BM value.

---

## 14. PLAYER FLOW

1. Player opens the dedicated Black Market module.
2. Player sees the 3 current special demands and their remaining quantities/timers.
3. Player selects eligible equipment from accessible player storage.
4. Player builds a cargo of up to 8 stacks / 5 units per stack.
5. UI displays for each cargo line:
   - equipment identity;
   - quantity;
   - economic/base BM value;
   - special-demand match/bonus where applicable.
6. UI displays total cargo value and predicted success payout for each route.
7. Player selects Route surveillée, Route contestée or Route interdite.
8. Confirmation clearly states:
   - cargo committed;
   - success chance;
   - route duration;
   - Silver payout on success;
   - complete cargo loss on failure;
   - no cancellation.
9. Player confirms.
10. Cargo is removed immediately.
11. Applicable special-demand quantities are consumed immediately.
12. Outcome is fixed and persisted but hidden.
13. Convoy progresses online/offline.
14. At completion, result is revealed.
15. Success credits Silver exactly once; failure credits 0 and confirms cargo loss.
16. A detailed recap is presented.

---

## 15. RESULT RECAP

The completion recap must make the economic result understandable.

### Success recap

Display:

- route used;
- cargo contents;
- cargo economic/BM value;
- special-demand bonuses applied;
- route multiplier;
- final Silver received.

### Failure recap

Display:

- route used;
- cargo contents;
- value that was at risk;
- special-demand context if relevant;
- `Cargo lost` / equivalent clear failure state;
- final Silver received: `0`.

The UI should make the risk legible before departure and the result auditable afterward.

---

## 16. PERSISTENCE / OFFLINE REQUIREMENTS

The convoy is persistent game state.

Save data must preserve enough authoritative information to prevent:

- rerolling success/failure through reload;
- changing cargo after departure;
- changing demand bonuses after departure;
- receiving the payout more than once;
- recovering lost cargo through load/import edge cases.

Offline time advances convoy completion normally.

Special-demand daily rotation must also be deterministic/persisted enough to prevent reload rerolls.

---

## 17. DATA-DRIVEN / OWNERSHIP REQUIREMENTS

Per `AGENTS.md` and the project data-ownership contract:

`packages/data` owns authored static truth such as:

- route definitions;
- route success chances;
- route durations;
- route payout multipliers;
- BM base conversion rate;
- cargo slot/stack limits;
- demand count/reset rules;
- demand quantity ranges;
- demand bonus values/weights;
- eligible target contracts and canonical IDs/mappings;
- eventual Black Market unlock contract once validated.

`packages/gameplay` owns:

- equipment value calculation/derivation;
- cargo validation;
- special-demand matching;
- demand allocation across quantities;
- route outcome resolution;
- payout calculation;
- state transitions;
- destruction/consumption semantics;
- exactly-once completion/payout behavior.

`apps/client` owns:

- Black Market presentation;
- cargo composition UI;
- route selection UI;
- timers/status;
- confirmation/recap presentation;
- orchestration/adapters only.

Do not duplicate craft/material/enchantment values inside Black Market authored data.

Black Market must derive from the same canonical contracts used by crafting/refining/enchantment/economy.

---

## 18. EXPLICITLY OUT OF SCOPE FOR V1

Not included unless separately designed/validated:

- exact Black Market unlock condition;
- multiple simultaneous convoys;
- Black Market reputation/levels;
- route upgrades;
- cargo-capacity progression;
- cancel/recall after departure;
- partial cargo recovery after failure;
- Awakened item valuation/submission;
- exact-item special demands;
- player-controlled reroll of special demands;
- Black Market-exclusive equipment/rewards.

---

## 19. DESIGN SUMMARY

Black Market V1 is a controlled endgame conversion loop:

`production surplus`
`-> crafted equipment`
`-> up to 8 stacks / 5 units each`
`-> optional temporary demand premium`
`-> choose one of 3 risk routes`
`-> wait 15/30/60 min`
`-> SUCCESS: Silver payout`
`-> FAILURE: total cargo destruction`

Normal Black Market conversion intentionally destroys economic value on average, while special demands create temporary opportunities where targeted production can become especially attractive.

The system's core purpose is not to maximize Silver generation. Its purpose is to make excess production useful, create a durable equipment sink, and add a meaningful endgame risk/reward decision.