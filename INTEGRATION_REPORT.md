# Albion Idle — rapport d’intégration

## Base utilisée

- Archive Claude : `albion-idle (3).zip`
- Projet intégré : `albion-idle/ALBION IDLE`

## Stratégie

La version Claude a été conservée comme base afin de préserver ses ajouts récents.
Les changements validés dans la branche locale GPT ont ensuite été appliqués
uniquement aux fichiers client concernés.

## Éléments GPT intégrés

- nouvelle hiérarchie du viewport de combat et HUD flottant ;
- décor de combat pixel art ;
- sprites du héros, du monstre, des équipements et des potions ;
- animations et retours visuels de combat ;
- panneau Personnage fusionnant statistiques et équipement ;
- inventaire avec visuels, interactions d’équipement et consommables ;
- maîtrises par familles et spécialisations ;
- frise compacte de progression des segments ;
- navigation entre zones avec prévisualisation ;
- modes Progression et Farm ;
- règles de PV, boss, défaite et reprise des rencontres ;
- préférences et placement non bloquant des notifications.

## Éléments Claude préservés

Les nouveaux modules de gathering, crafting, recettes, stations, raffinage,
workers, automatisation et leurs tests ont été conservés. Les exports ajoutés
dans `packages/gameplay/src/index.ts` n’ont pas été remplacés.

## Vérifications

- compilation TypeScript du monorepo : réussie ;
- vérification TypeScript du client : réussie ;
- build Vite de production : réussi.

Le build signale seulement la taille importante du bundle Phaser, sans erreur.
