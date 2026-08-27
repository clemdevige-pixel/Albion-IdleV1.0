# SpriteSheet Generator

## TL;DR

Le SpriteSheet Generator normalise techniquement les animations héros d’Albion Idle à partir d’une spritesheet source et d’une référence visuelle validée.

Le workflow utilisateur standard n’utilise pas directement cette commande unitaire : il passe par `generate:spritesheet-import`, documenté dans `docs/tooling/asset-integration-workflow.md`.

L’outil :

- détecte et découpe les frames ;
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

Quand cette valeur est fournie, l’outil utilise une détection guidée par le nombre de frames :

1. il cherche d’abord une zone entièrement transparente autour de chaque frontière attendue ;
2. si deux frames sont reliées par quelques pixels (arme, cape, antialiasing, etc.), il cherche la vallée de plus faible occupation autour de cette frontière ;
3. la coupure de secours est faite entre deux colonnes afin de ne supprimer aucun pixel source.

Ainsi, une source n’a plus besoin de posséder exactement `N - 1` bandes totalement transparentes pour être découpée en `N` frames.

### `--calibration-frame`

Frame source utilisée pour mesurer l’échelle par rapport à la référence.

Utiliser de préférence une pose debout ou proche d’une pose neutre.

### `--min-gap`

Seuil du mode de détection historique/fallback utilisé uniquement sans `--frame-count`.

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

### 2. Découpage des frames

L’outil mesure l’occupation de chaque colonne.

Avec `--frame-count`, chaque frontière de frame dispose d’un corridor de recherche autour de sa position théorique.

Priorité :

1. bande transparente pertinente ;
2. sinon minimum local d’occupation.

Le second mode est important pour les animations où une arme ou un accessoire empiète légèrement sur l’espace entre deux sprites.

Sans `--frame-count`, le fallback utilise uniquement les bandes transparentes atteignant `--min-gap`.

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
8. intégrité des frames découpées, surtout si une coupure low-density a été nécessaire.

---

## Cas particuliers

### Personnage penché / tête baissée

Règle : même échelle physique, pose conservée.

### Death

Une pose couchée ne doit pas être agrandie pour ressembler à une idle.

### Frames reliées par une arme

Ce cas est supporté en mode `--frame-count`. L’outil cherche une frontière à faible densité et coupe entre colonnes sans jeter les pixels source.

La sortie doit néanmoins être vérifiée visuellement pour confirmer que la frontière choisie est cohérente.

### Référence complète

Une spritesheet du jeu peut être utilisée directement avec `--reference-frame` et `--reference-frame-count`.

---

## Dépannage

### Mauvais découpage malgré `--frame-count`

Vérifier :

1. le nombre réel de frames ;
2. que les frames sont bien organisées horizontalement sur une seule ligne ;
3. qu’elles occupent des zones globalement distinctes ;
4. le résultat visuel avant intégration.

Ne pas commencer par bricoler `--min-gap` : ce paramètre n’est pas utilisé par le mode count-aware.

### Scale unsafe

Un scale automatique inférieur à `0.4` ou supérieur à `2.5` est bloqué.

Causes probables :

- mauvaise référence ;
- mauvaise calibration ;
- mauvais découpage ;
- `body core` faussé.

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
