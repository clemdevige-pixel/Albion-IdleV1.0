# SpriteSheet Generator

## TL;DR

Le SpriteSheet Generator normalise techniquement les animations héros d’Albion Idle à partir d’une spritesheet source et d’une référence visuelle validée.

Le workflow utilisateur standard passe par `generate:spritesheet-import`, documenté dans `docs/tooling/asset-integration-workflow.md`.

L’outil :

- détecte et découpe les frames ;
- préserve les composants opaques d’une frame même lorsqu’ils débordent horizontalement ;
- utilise une frame de référence validée ;
- calcule un seul facteur d’échelle pour toute l’animation ;
- conserve les variations de pose ;
- aligne une baseline commune ;
- recentre horizontalement ;
- reconstruit une spritesheet alpha avec un spacing de sortie standardisé.

Il ne corrige pas une mauvaise animation, un mauvais design d’arme ou une pose artistiquement incorrecte. La validation visuelle reste humaine.

---

## Workflow standard d’intégration

Lire en priorité :

```text
docs/tooling/asset-integration-workflow.md
```

Flux standard :

1. l’utilisateur dépose les spritesheets brutes directement dans `.tmp/spritesheet-imports/` sur GitHub ;
2. l’agent récupère la branche ;
3. l’agent lance `generate:spritesheet-import -- --weapon=<weaponId>` ;
4. le wrapper filtre les fichiers de cette arme et orchestre ce générateur ;
5. les sorties sont déposées dans `apps/client/public/assets/characters/` ;
6. l’utilisateur valide visuellement ;
7. l’agent câble ensuite les assets dans le jeu.

Exemple :

```powershell
pnpm.cmd generate:spritesheet-import -- --weapon=deathgiver
```

---

## Commande unitaire

```powershell
pnpm.cmd generate:spritesheet -- --input="PATH_TO_SOURCE.png" --reference="PATH_TO_REFERENCE.png" --reference-frame=0 --output="PATH_TO_RESULT.png" --frame-count=6 --calibration-frame=0
```

Le wrapper d’import appelle cette commande automatiquement.

---

## Paramètres principaux

### `--input`

Spritesheet source à normaliser.

### `--reference`

Image ou spritesheet contenant une frame de référence validée du personnage.

### `--reference-frame`

Index de la frame de référence. Les index commencent à `0`.

### `--reference-frame-count`

Nombre de frames attendu dans la spritesheet de référence lorsqu’il est connu.

### `--output`

Chemin du PNG généré.

### `--frame-count`

Nombre de frames attendu dans la source. Mode recommandé.

```text
--frame-count=6
```

Quand cette valeur est fournie, le générateur utilise le mode **component-aware** :

1. il détecte les composants opaques connectés dans toute la spritesheet ;
2. il regroupe ces composants horizontalement en exactement `N` frames ;
3. chaque composant est affecté entièrement à une frame ;
4. les frames sont reconstruites à partir des composants affectés, au lieu de couper l’image par une simple ligne verticale.

Conséquence importante : une main, une arme ou une cape qui déborde horizontalement dans la zone de la frame voisine n’est plus automatiquement coupée en deux.

Ce mode remplace l’ancien découpage count-aware basé sur les vallées de densité.

### `--calibration-frame`

Frame source utilisée pour mesurer l’échelle par rapport à la référence.

Utiliser de préférence une pose debout ou proche d’une pose neutre.

### `--min-gap`

Seuil du mode historique/fallback utilisé uniquement sans `--frame-count`.

Valeur par défaut : `64`.

### `--output-gap`

Spacing ajouté entre les cellules générées.

Valeur par défaut : `64 px`.

Il est indépendant du découpage de la source.

### `--alpha-threshold`

Seuil alpha de visibilité. Valeur par défaut : `8`.

### `--edge-padding`

Marge verticale de sortie. Valeur par défaut : `8`.

### `--scale`

Override manuel du facteur d’échelle. À réserver au diagnostic de cas exceptionnels.

---

## Fonctionnement

### 1. Normalisation du format

Source et référence sont temporairement normalisées en PNG RGBA.

### 2. Découpage component-aware

Avec `--frame-count`, l’outil ne cherche plus une colonne de coupure entre les sprites.

Il réalise un flood-fill sur les pixels visibles afin de construire les composants opaques connectés.

Chaque composant possède notamment :

- une aire ;
- une bounding box ;
- un centre horizontal.

Les composants sont ensuite regroupés horizontalement en `N` clusters correspondant aux `N` frames attendues. Le poids d’un composant dépend de son aire : les corps principaux pilotent donc naturellement le centre des frames, tandis que les petits éléments détachés sont rattachés au groupe le plus cohérent.

La frame finale est reconstruite uniquement avec les composants de son groupe.

Cela permet à deux frames de se chevaucher en X dans la source sans qu’un membre soit nécessairement découpé.

Sans `--frame-count`, le fallback historique continue d’utiliser les bandes transparentes atteignant `--min-gap`.

### 3. Mesure du gabarit

L’outil mesure un `body core` central plutôt que la bounding box complète afin de réduire l’influence d’éléments extrêmes :

- arme levée ;
- arc ;
- cape ;
- accessoires éloignés du corps.

### 4. Scale unique

Le scale est calculé entre :

- la frame de référence ;
- la frame de calibration source.

Ce scale est appliqué à toutes les frames. Une frame penchée ou couchée n’est jamais redimensionnée indépendamment pour retrouver la hauteur d’une idle.

### 5. Baseline et ancrage

Les frames sont repositionnées avec :

- une baseline commune ;
- une ancre horizontale issue de la partie basse du `body core`.

### 6. Reconstruction

La sortie conserve :

- alpha réel ;
- proportions ;
- pose ;
- scale unique ;
- spacing standardisé.

---

## Import automatisé

Wrapper :

```text
packages/tooling/src/bin/import-hero-spritesheets.ts
```

Commande :

```powershell
pnpm.cmd generate:spritesheet-import -- --weapon=<weaponId>
```

Dossier source par défaut :

```text
.tmp/spritesheet-imports/
```

Toutes les armes peuvent cohabiter dans ce dossier. Le wrapper filtre uniquement les PNG dont le nom contient l’identifiant demandé et une animation reconnue :

```text
idle
walk
attack
death
```

Le nommage tolère les espaces, `_` et `-` tant que l’arme et l’animation restent reconnaissables.

Exemples :

```text
deathgivers idle.png
deathgiver-attack.png
permafrost_walk.png
```

Sorties :

```text
apps/client/public/assets/characters/hero-<weaponId>-<animation>-sheet-v1.png
```

Report :

```text
.tmp/spritesheet-imports/generation-report-<weaponId>.json
```

---

## Validation visuelle

Toujours après génération et avant câblage jeu.

Vérifier :

1. gabarit ;
2. baseline / pieds ;
3. conservation des poses ;
4. arme/accessoires ;
5. drift horizontal ;
6. spacing ;
7. alpha ;
8. qu’aucun membre ou objet n’a été affecté à la mauvaise frame.

---

## Limite connue

Le mode component-aware suppose que les sprites d’une même frame restent séparables en composants opaques distincts de ceux des autres frames.

Si deux frames se touchent réellement pixel contre pixel dans la source, elles peuvent devenir un seul composant connecté. Dans ce cas, aucun découpage purement algorithmique ne peut savoir où séparer sans information supplémentaire : la source doit être corrigée ou un mode d’override explicite devra être ajouté.

---

## Architecture

Fichier principal :

```text
packages/tooling/src/bin/generate-spritesheet.ts
```

Wrapper :

```text
packages/tooling/src/bin/import-hero-spritesheets.ts
```

Commandes :

```text
pnpm generate:spritesheet
pnpm generate:spritesheet-import
```

Un agent qui reprend le chantier doit améliorer ces outils existants et ne pas créer de pipeline parallèle.
