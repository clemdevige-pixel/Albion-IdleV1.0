# Asset Integration Workflow

## TL;DR

Quand l’utilisateur dit :

> je veux travailler sur l’intégration des assets

l’agent doit suivre ce document puis `docs/tooling/spritesheet-generator.md`.

Workflow standard :

1. l’utilisateur dépose les spritesheets brutes directement dans `.tmp/spritesheet-imports/` ;
2. l’agent récupère la branche ;
3. l’agent lance `generate:spritesheet-import -- --weapon=<weaponId>` ;
4. l’outil filtre, découpe, calibre chaque spritesheet directement contre la référence globale, normalise, renomme et dépose les sorties ;
5. l’utilisateur vérifie visuellement les sorties ;
6. seulement après validation, l’agent câble les assets dans le jeu.

---

## Contrat de taille — règle absolue

La frame `0` de la référence globale est l’unique autorité de taille pour Albion Idle.

Par défaut :

```text
apps/client/public/assets/characters/hero-broadsword-attack-sheet-v1.png
reference-frame = 0
```

Pour **chaque spritesheet source indépendamment** :

```text
scale = hauteur personnage de la frame de référence / hauteur personnage de la frame de calibration source
```

Puis ce scale unique est appliqué à toutes les frames de cette spritesheet.

Il n’existe plus de `sharedScale` par arme et aucune animation ne prend une autre animation comme référence.

La référence globale reste donc la seule cible de gabarit, quelle que soit l’arme ou l’animation.

### Mesure utilisée pour le scale

Pour éviter qu’un petit élément détaché (dague, cape, accessoire) pilote la taille :

1. l’outil détecte les composants opaques connectés ;
2. il conserve les `N` composants dominants correspondant aux `N` corps des frames ;
3. il les trie horizontalement ;
4. il mesure la hauteur du composant principal de la frame choisie.

La frame source de calibration vaut `0` par défaut.

Si la source ne permet pas de résoudre proprement les `N` corps attendus, l’outil doit échouer au lieu d’inventer un scale.

---

## Dépôt utilisateur

L’utilisateur ne crée pas de sous-dossier par arme.

Toutes les sources vont directement dans :

```text
.tmp/spritesheet-imports/
```

Exemple :

```text
.tmp/spritesheet-imports/
├── deathgivers idle.png
├── deathgiver-attack.png
├── permafrost-idle.png
└── permafrost-death.png
```

Animations reconnues :

```text
idle
walk
attack
death
```

Le nommage tolère espaces, `_` et `-`.

---

## Commande standard

```powershell
pnpm.cmd generate:spritesheet-import -- --weapon=deathgiver
```

Le wrapper :

1. filtre les fichiers Deathgiver ;
2. détecte les animations présentes ;
3. mesure la frame `0` de la référence globale ;
4. mesure la frame de calibration de **chaque source** ;
5. calcule le scale source → référence ;
6. appelle le générateur avec ce scale explicite ;
7. conserve les poses ;
8. applique le découpage component-aware ;
9. aligne/reconstruit la spritesheet ;
10. renomme et dépose les sorties dans :

```text
apps/client/public/assets/characters/
```

Sorties :

```text
hero-<weaponId>-idle-sheet-v1.png
hero-<weaponId>-walk-sheet-v1.png
hero-<weaponId>-attack-sheet-v1.png
hero-<weaponId>-death-sheet-v1.png
```

---

## Calibration

Frame source de calibration par défaut :

```text
0
```

Overrides possibles :

```text
--idle-calibration-frame=0
--walk-calibration-frame=1
--attack-calibration-frame=0
--death-calibration-frame=0
```

La frame de référence reste indépendante :

```text
--reference-frame=0
```

Changer une frame de calibration source ne change jamais la référence globale.

---

## Report

Le wrapper écrit :

```text
.tmp/spritesheet-imports/generation-report-<weaponId>.json
```

Le report contient notamment :

- `referenceHeight` ;
- `sourceHeight` par animation ;
- `scale` par animation ;
- source ;
- output ;
- dimensions de cellule générées.

Important : les scales des animations peuvent être différents si leurs sources brutes n’ont pas la même taille. Ce n’est pas un problème : **leurs tailles finales doivent converger vers la même hauteur cible de référence**.

---

## Vérification visuelle

Toujours après génération et avant câblage.

Vérifier :

1. même gabarit physique que la référence ;
2. cohérence de taille idle / walk / attack / death ;
3. aucun membre transféré dans une autre frame ;
4. baseline / pieds ;
5. conservation des poses ;
6. spacing ;
7. alpha.

Si ce n’est pas validé, ne pas câbler.

---

## Câblage jeu

Après validation, l’agent repart de l’architecture existante, notamment :

```text
apps/client/src/game/render/HeroRenderCatalog.ts
```

Vérifier :

- `textureKey` ;
- `assetPath` ;
- `frameRate` ;
- dimensions attendues ;
- offset si nécessaire ;
- visual profile existant.

Ne pas créer de pipeline parallèle.

---

## Point d’entrée pour un nouvel agent

Si l’utilisateur dit :

> je veux travailler sur l’intégration des assets

l’agent doit :

1. lire ce document ;
2. lire `docs/tooling/spritesheet-generator.md` ;
3. regarder `.tmp/spritesheet-imports/` ;
4. identifier le `weaponId` ;
5. lancer l’import ;
6. faire valider visuellement ;
7. câbler seulement après validation.
