# Faction Expedition Reward Baseline — 2026-08-24

Status: **baseline testeurs**, susceptible d’être retunée après retours live.

## Rôle

L’Expédition Faction est une source majeure passive de :

- Rune de faction commune du tier ;
- Fragment de clé de donjon du tier ;
- Clé complète de donjon du tier.

Silver et Éclats d’enchantement restent hors de cette table et appartiennent à l’Expédition Silver généraliste.

## EV horaire validée

| Tier | Runes/h EV | Fragments/h EV | Clés complètes/h EV |
|---|---:|---:|---:|
| T4 | 8 | 24 | 1.20 |
| T5 | 14 | 22 | 1.10 |
| T6 | 25 | 19 | 1.00 |
| T7 | 40 | 17 | 0.80 |
| T8* | 60 | 9 | 0.45 |

*T8 clés/fragments reste provisoire tant que Blackspire n’est pas farmable dans le profil benchmark T8.3 utilisé pour la calibration.

## Variance

- Runes : tirages horaires indépendants, distribution triangulaire centrée, amplitude max ±20% par tranche horaire.
- Fragments : tirages horaires indépendants, distribution triangulaire centrée, amplitude max ±30% par tranche horaire.
- Clés complètes : distribution Poisson sur l’EV totale de l’expédition.
- Une expédition longue conserve la même EV/h mais devient relativement plus stable grâce à l’agrégation de plusieurs tirages horaires.

## Règle absolue — clés entières

`completeKeysPerHourEv` est uniquement une valeur de calibration interne.

Le joueur ne reçoit **jamais** de fraction de clé. La résolution produit toujours un entier `0, 1, 2, 3...`.

## Durées

Les options 2h / 6h / 12h conservent la même EV/h. Aucune durée ne reçoit de bonus de rendement implicite.

## Qualificatif de résultat

Le récapitulatif présente un qualificatif calculé depuis le tirage réel, sans bonus gameplay supplémentaire :

- Difficile
- Réussie
- Fructueuse
- Exceptionnelle

Le qualificatif est purement descriptif : il ne déclenche aucun second roll et ne modifie aucune récompense.

## Source de vérité code

`apps/client/src/data/factionExpeditionRewardContentCatalog.ts`

La table de tuning et les règles de variance doivent rester data-driven et ne doivent pas être dupliquées dans l’UI ou dans le runtime.
