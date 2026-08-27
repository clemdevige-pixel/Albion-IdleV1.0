# SpriteSheet Generator

## TL;DR

Le SpriteSheet Generator normalise techniquement les animations héros d’Albion Idle à partir d’une spritesheet source et d’une **référence visuelle globale validée**.

Le contrat de taille est absolu :

> toutes les armes et toutes les animations doivent converger vers le même gabarit physique défini par la référence globale.

Le workflow utilisateur standard passe par `generate:spritesheet-import`, documenté dans `docs/tooling/asset-integration-workflow.md`.

L’outil :

- détecte et découpe les frames ;
- préserve les composants opaques d’une frame même lorsqu’ils débordent horizontalement ;
- mesure le corps avec une bande centrale robuste ;
- compare cette mesure à la référence globale ;
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

## Contrat de référence globale

La référence n’est pas une simple aide visuelle : elle est **l’autorité de taille**.

Par défaut :

```text
apps/client/public/assets/characters/hero-broadsword-attack-sheet-v1.png
```

avec :

```text
referenceFrame=0
referenceFrameCount=6
```

Pour chaque spritesheet source :

1. la frame de calibration source est mesurée ;
2. la frame de référence globale est mesurée avec exactement le même algorithme ;
3. le scale est calculé par :

```text
scale = referenceBodyHeight / sourceBodyHeight
```

4. ce scale unique est appliqué à toutes les frames de l’animation.

Il est interdit de créer un standard de taille propre à une arme ou à une animation.

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
Image ou spritesheet contenant la référence globale validée du personnage.

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

Cela évite qu’une main, une arme ou une cape soit découpée et envoyée sur la frame voisine.

### `--calibration-frame`
Frame source utilisée pour mesurer l’échelle par rapport à la référence.

Utiliser de préférence une pose debout ou proche d’une pose neutre.

### `--min-gap`
Seuil du mode historique/fallback utilisé uniquement sans `--frame-count`.

Valeur par défaut : `64`.

### `--output-gap`
Spacing ajouté entre les cellules générées.

Valeur par défaut : `64 px`.

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
Avec `--frame-count`, l’outil réalise un flood-fill sur les pixels visibles afin de construire des composants opaques connectés.

Chaque composant possède notamment :
- une aire ;
- une bounding box ;
- un centre horizontal.

Les composants sont regroupés horizontalement en `N` clusters correspondant aux `N` frames attendues. La frame finale est reconstruite uniquement avec les composants de son groupe.

### 3. Mesure robuste du gabarit

Le bug historique venait d’une mesure dont la largeur dépendait de la bounding box complète. Une arme horizontale, un bras tendu ou une cape pouvait donc élargir la zone analysée et modifier artificiellement la hauteur calculée.

La mesure actuelle :

1. trouve la zone visible ;
2. estime le centre du corps à partir de la moitié basse du personnage ;
3. construit une bande verticale centrale dont la largeur dépend de la **hauteur visible**, pas de la largeur totale de la silhouette ;
4. mesure le haut et le bas du corps dans cette bande ;
5. ignore autant que possible les pixels isolés d’armes/accessoires.

Cette même mesure est appliquée à la source et à la référence globale.

### 4. Scale unique

```text
scale = referenceCoreHeight / calibrationCoreHeight
```

Le scale est appliqué à toutes les frames de l’animation. Une frame penchée ou couchée n’est jamais redimensionnée indépendamment pour retrouver la hauteur d’une idle.

### 5. Baseline et ancrage
Les frames sont repositionnées avec une baseline commune et une ancre horizontale issue de la partie basse du corps.

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

Toutes les armes peuvent cohabiter dans ce dossier. Le wrapper filtre les PNG dont le nom contient l’identifiant demandé et une animation reconnue :

```text
idle
walk
attack
death
```

Le nommage tolère les espaces, `_` et `-` tant que l’arme et l’animation restent reconnaissables.

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

1. gabarit identique à la référence globale ;
2. cohérence de taille entre idle / walk / attack / death ;
3. baseline / pieds ;
4. conservation des poses ;
5. arme/accessoires ;
6. drift horizontal ;
7. spacing ;
8. alpha ;
9. qu’aucun membre ou objet n’a été affecté à la mauvaise frame.

Si deux animations debout du même personnage ressortent visiblement à des tailles différentes, c’est un bug de mesure/calibration et non un comportement attendu.

---

## Limite connue

Le mode component-aware suppose que les sprites d’une même frame restent séparables en composants opaques distincts de ceux des autres frames.

Si deux frames se touchent réellement pixel contre pixel dans la source, elles peuvent devenir un seul composant connecté. Dans ce cas, la source doit être corrigée ou un override explicite doit être ajouté.

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
