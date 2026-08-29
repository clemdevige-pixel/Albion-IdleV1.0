# 46 — BLACK MARKET SYSTEM

Status: IMPLEMENTATION IN PROGRESS — VALIDATED DESIGN CONTRACT

The Black Market is the endgame equipment-to-Silver sink for Albion Idle. It absorbs long-term production surplus through a persistent risk/reward convoy loop rather than a direct equipment vendor sale.

Ownership remains mandatory:
- authored static truth -> `packages/data`;
- calculations, validation and state transitions -> `packages/gameplay`;
- presentation/adapters -> `apps/client`.

---

## 1. DESIGN GOAL

Core loop:

`surplus resources -> refining -> equipment craft -> Black Market cargo -> route risk -> total loss OR Silver payout`

The Black Market is intentionally a strong endgame Silver generator. Special-demand combinations may produce expected value above 100% of the submitted item's economic production cost. This is validated behavior, not automatically an imbalance.

Direct equipment selling is not part of the player-facing Merchant flow. The former `Vendre` tab is removed even before Black Market discovery. Once unlocked, `Marché Noir` occupies that second Merchant service position.

---

## 2. UNLOCK / MERCHANT INTEGRATION

The Black Market is unlocked by a dedicated Academy T8 research:

- Name: `Marché Noir`
- Tier: T8
- Academy requirement: T8-capable Academy
- Cost: **110,000 Silver**
- Duration: **4 hours**
- Additional materials: **none**
- Unlock id: `black_market:unlocked`

Before completion:
- Merchant exposes no `Vendre` tab;
- Black Market tab is hidden.

After completion:
- `Marché Noir` appears in the Merchant at the former `Vendre` position;
- it remains a distinct system/flow, not a normal vendor transaction list.

Canonical research source:
`packages/data/src/config/research-content.ts`

Client research presentation:
`apps/client/src/data/researchContentCatalog.ts`

---

## 3. DAILY RESET CONTRACT

Black Market Special Demands and the Daily Merchant share the same canonical logical day boundary:

- reset: **00:00 UTC**;
- one shared daily reset authority;
- independent deterministic namespaces/seeds are allowed and required where appropriate.

Canonical authored reset:
`packages/data/src/config/daily-reset.ts`

Canonical gameplay day/reset helpers:
`packages/gameplay/src/time/daily-reset.ts`

Do not duplicate another `00:00 UTC` constant inside Black Market or Daily Merchant code.

---

## 4. ACTIVE CONVOY LIMIT

Only **1 convoy may be active at a time** in V1.

At departure:
- cargo is removed immediately;
- applicable demand quantities are consumed immediately;
- route, cargo values, payout-on-success and success/failure outcome are frozen;
- the outcome is persisted but hidden;
- convoy cannot be cancelled or recalled.

Offline elapsed time counts normally because completion is timestamp-based.

---

## 5. CARGO CONTRACT

Cargo accepts equipment only.

Capacity:
- **8 stacks** maximum;
- **5 identical units per stack** maximum;
- maximum theoretical cargo: **40 equipment units**.

Accepted:
- standard crafted equipment;
- artifact equipment/weapons;
- enchantments `.0` through `.4`.

Rejected:
- Awakened equipment;
- currently equipped items.

Sources:
- player Inventory;
- Bank.

Mixed tiers and equipment families are allowed.

---

## 6. CANONICAL ECONOMIC VALUE

Black Market does **not** own an `item -> price` table.

Equipment economic value is calculated from the real inputs consumed by the current craft/enchantment runtime.

### 6.1 Production input values

Generic economic values used by both systems that need them live in:

`packages/data/src/config/economic-item-values.ts`

Current canonical unit values:

| Tier | Raw | Refined | Enchantment shard |
|---|---:|---:|---:|
| T4 | 400 | 2,000 | 1,000 |
| T5 | 1,000 | 5,500 | 1,500 |
| T6 | 2,250 | 14,000 | 2,000 |
| T7 | 3,000 | 22,000 | 2,500 |
| T8 | 3,750 | 30,500 | 3,500 |

The Daily Merchant consumes the same raw/refined/shard values, but its shop price is not automatically economic truth for every item category.

### 6.2 Base equipment craft

`EquipmentEconomicValue(.0) = value of the recipe inputs actually consumed`

Important live contract:
- standard higher-tier weapon recipes currently require predecessor topology/ownership where relevant to progression logic, but **do not consume the T(n-1) weapon in the recipe**;
- therefore Black Market valuation must **not** add a predecessor value that was not destroyed by the craft.

The resolver consumes the current authored recipe requirements, not a stale recursive predecessor formula.

### 6.3 Artifact intrinsic value

Daily Merchant artifacts are intentionally scarcity/convenience-priced and must not be reused as intrinsic Black Market economic value.

Validated intrinsic artifact values:

| Tier | Artifact economic value |
|---|---:|
| T4 | 35,000 |
| T5 | 60,000 |
| T6 | 100,000 |
| T7 | 150,000 |
| T8 | 220,000 |

### 6.4 Faction Rune intrinsic value

Artifact weapon recipes consume the existing authored Rune quantities:

- T4: 5
- T5: 6
- T6: 7
- T7: 8
- T8: 10

Validated Rune economic value per unit:

| Tier | Value / Rune |
|---|---:|
| T4 | 1,000 |
| T5 | 1,250 |
| T6 | 1,500 |
| T7 | 1,750 |
| T8 | 2,000 |

Rune quantity provides most of the tier scaling; unit value intentionally remains restrained to avoid double-scaling artifact weapon values.

### 6.5 Enchantment investment

For `.1/.2/.3/.4`, the value is cumulative:

`EnchantedEquipmentValue = BaseCraftValue + every consumed enchant resource + every consumed enchant Silver`

The resolver uses the actual gameplay enchantment recipe scaler. No arbitrary `.1/.2/.3` Black Market multiplier is allowed.

For artifact weapons, faction Runes that are part of the authored craft-material set continue to participate in the live enchantment material scaling where the existing enchantment runtime does so.

Canonical gameplay resolver:
`packages/gameplay/src/black-market/economic-value.ts`

---

## 7. NORMAL BLACK MARKET VALUE

`NormalBMValue = EquipmentEconomicValue x 0.55`

The **55%** base rate is authored Black Market balance.

Representative validated standard examples:

| Item profile | Economic value | Normal BM |
|---|---:|---:|
| T4.0 two-handed reference | 20,000 | 11,000 |
| T6.0 two-handed reference | 140,000 | 77,000 |
| T6.2 two-handed reference | 705,156 | 387,836 |
| T8.0 two-handed reference | 305,000 | 167,750 |
| T8.3 two-handed reference | 3,099,375 | 1,704,656 |

Representative T8.0 artifact reference:
- standard craft: 305,000;
- artifact: 220,000;
- 10 T8 Runes: 20,000;
- economic value: **545,000**;
- normal BM value: **299,750**.

---

## 8. ROUTES

| Route | Success | Success multiplier | Duration |
|---|---:|---:|---:|
| Route surveillée | 90% | x1.20 | 15 min |
| Route contestée | 70% | x1.75 | 30 min |
| Route interdite | 45% | x3.00 | 60 min |

Failure:
- cargo lost completely;
- payout = 0;
- no partial recovery.

Ignoring Special Demands, expected return relative to full economic value remains:
- surveillée: 59.4%;
- contestée: 67.375%;
- interdite: 74.25%.

Higher risk intentionally has higher EV.

---

## 9. OUTCOME / ANTI-REROLL / PAYOUT

At departure:
- outcome is deterministically fixed;
- cargo and payout inputs are frozen;
- frozen state is persisted;
- UI does not reveal success/failure.

At/after completion timestamp:
- result is revealed on authoritative Black Market resolution/access;
- success credits the frozen Silver payout;
- failure credits 0;
- active convoy is consumed into a persisted result state;
- payout must happen at most once.

Reload/import must not reroll an existing convoy.

Canonical domain service:
`packages/gameplay/src/black-market/black-market-service.ts`

---

## 10. SPECIAL DEMANDS

There are **3 active demands** per daily rotation.

Targets:
- `weapon family + tier`;
- `armor slot + tier`.

Weapon families V1:
- sword;
- bow;
- fire staff;
- gloves;
- dagger.

Armor slots V1:
- head;
- torso;
- boots.

Tier selection:
- every already-unlocked World tier T4-T8 remains eligible;
- eligible tiers have equal weight;
- lower unlocked tiers stay relevant even when T8 is reached.

Duplicates:
- exact `target + tier` duplicate forbidden;
- cross-tier or different-target overlaps allowed.

Demand quantities:

| Tier | Quantity |
|---|---:|
| T4 | 5-8 |
| T5 | 4-7 |
| T6 | 3-6 |
| T7 | 2-5 |
| T8 | 1-4 |

Bonus distribution:

| Level | Bonus | Weight |
|---|---:|---:|
| Demand | +40% | 60 |
| Strong demand | +70% | 30 |
| Shortage | +100% | 10 |

Bonus applies only to still-requested compatible units.

Demand quantity is consumed at **departure**, regardless of later convoy success/failure.

---

## 11. PAYOUT FORMULA

Per submitted unit:

`EquipmentEconomicValue`
`-> x0.55 normal BM rate`
`-> + applicable Special Demand bonus on BM value`
`-> x route success multiplier`

Aggregate all units into the frozen payout-on-success.

If route fails:

`FinalPayout = 0`

Special Demand EV above 100% of production economic value is permitted by design in sufficiently strong demand/route combinations.

---

## 12. PLAYER FLOW / UI

Merchant service order after Black Market unlock:

`Acheter | Marché Noir | Enchanter | Réparer`

Before unlock:

`Acheter | [no sell/BM tab] | Enchanter if unlocked | Réparer`

Black Market page composition:
1. three Special Demand cards + daily reset timer;
2. eligible Inventory/Bank equipment and cargo quantities;
3. cargo economic value + BM value including demand allocation;
4. three route cards showing success chance, multiplier, duration, payout-on-success and EV;
5. clear total-loss warning and departure action.

During active convoy:
- route;
- remaining time;
- item count;
- BM value at risk;
- potential payout;
- result shown as hidden until completion.

Completion recap:
- success/failure;
- route;
- value committed;
- Silver received or 0;
- cargo-loss state on failure.

Client implementation:
`apps/client/src/ui/merchant/black-market/BlackMarketView.tsx`
`apps/client/src/runtime/BlackMarketRuntime.ts`

---

## 13. PERSISTENCE

Black Market uses the existing runtime SaveProvider/SaveManager architecture.

Provider id:
`black_market`

Persisted state includes enough frozen information to preserve:
- daily demand progress;
- active cargo recap;
- departure/completion timestamps;
- route;
- fixed success/failure;
- frozen payout-on-success;
- last completed result.

Runtime registration:
`apps/client/src/runtime/RuntimePersistence.ts`

No parallel persistence system is allowed.

---

## 14. DATA / GAMEPLAY / CLIENT AUTHORITIES

`packages/data`:
- `black-market-balance.ts`: BM-only authored rates/routes/capacities/demand rules;
- `economic-item-values.ts`: generic production/artifact/Rune economic inputs;
- `research-content.ts`: T8 Black Market research;
- `daily-reset.ts`: shared daily boundary.

`packages/gameplay`:
- `black-market/economic-value.ts`: economic resolver;
- `black-market/black-market-service.ts`: demand generation/matching, cargo quote/validation, outcome, payout state, persistence payload semantics.

`apps/client`:
- existing recipe catalogs are adapted into the gameplay resolver without copying their values;
- Inventory/Bank transaction adapter;
- Merchant Black Market UI;
- save registration/orchestration.

Do not move Black Market algorithms into `packages/data` and do not create synchronized BM copies of craft/enchantment values.

---

## 15. OUT OF SCOPE V1

- multiple active convoys;
- Black Market reputation/levels;
- route upgrades;
- cargo-capacity progression;
- cancel/recall;
- partial recovery;
- Awakened item submission/valuation;
- exact-item demand targets;
- player reroll of daily demands;
- Black Market-exclusive equipment/rewards;
- restoration of direct equipment selling as a competing player-facing flow.

---

## 16. VALIDATION CONTRACT

Required coverage includes:
- deterministic demands and duplicate guard;
- all unlocked tiers eligible;
- cargo 8-stack / 5-unit limits;
- standard and artifact economic examples;
- cumulative enchant valuation;
- demand consumption at departure;
- fixed outcome across save/load;
- payout exactly once;
- shared daily reset boundary;
- Merchant tab unlock/replacement behavior;
- full project lint/typecheck/test/build and Blue runtime determinism.

=========================
DOCUMENT TERMINÉ
=========================
