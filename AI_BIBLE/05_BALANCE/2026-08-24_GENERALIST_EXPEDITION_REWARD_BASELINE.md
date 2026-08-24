# Generalist Expedition reward baseline — 2026-08-24

Status: VALIDATED TESTER BASELINE

## Purpose

The player-facing Generalist Expedition replaces the old Silver-only presentation while preserving historical internal `silver` IDs for compatibility.

It grants two rewards:

- Silver;
- matching-tier enchantment shards.

## Authored baseline

| Tier | Silver/h EV | Silver variance | Shards/h EV | Shard variance |
|---|---:|---:|---:|---:|
| T4 | 30,000 | +/-20% | 46 | +/-25% |
| T5 | 55,000 | +/-20% | 47 | +/-25% |
| T6 | 70,000 | +/-20% | 50 | +/-25% |
| T7 | 80,000 | +/-20% | 43 | +/-25% |
| T8 | 90,000 | +/-20% | 38 | +/-25% |

Both reward channels use centered triangular hourly rolls.

The EV/hour is identical for 2h, 6h and 12h durations. Each hour is rolled independently, so longer Expeditions are statistically more stable in relative terms without receiving a better average yield.

All credited quantities are integers.

## Calibration source

The baseline was derived from the deepest currently farmable Tn.3 world references across the five base weapons:

| Tier | World reference | Avg Silver/h | Avg shards/h |
|---|---|---:|---:|
| T4 | Frostpeak Mountain S9 | 50,860 | 92.5 |
| T5 | Ironveil Peaks S9 | 89,081 | 94.5 |
| T6 | Ashenpeak Mountain S9 | 115,571 | 99.4 |
| T7 | Doompeak Mountain S9 | 132,758 | 86.2 |
| T8 | Duskfall Steppe S9 | 145,291 | 75.6 |

Generalist Silver targets roughly 60% of the active deep-world reference. Shards target roughly half of the equivalent active-world reference.

T8 remains provisional because Blackspire Mountain is not yet reliably farmable with the benchmark T8.3 profile.

## Runtime authority

Canonical data:

`apps/client/src/data/generalistExpeditionRewardContentCatalog.ts`

The Expedition runtime consumes this table directly. UI recap displays the actual rolled rewards and does not reconstruct reward authority.

## Tester follow-up

These values may be retuned after tester telemetry. Retuning should remain data-only unless a genuine system-design change is approved.
