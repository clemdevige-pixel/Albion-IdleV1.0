# SpriteSheet Generator

## TL;DR

Le SpriteSheet Generator normalise techniquement une spritesheet d’animation pour Albion Idle à partir d’une spritesheet source et d’une référence validée du personnage.

L’outil :

- détecte les frames ;
- utilise une frame de référence validée ;
- calcule un seul facteur d’échelle pour toute l’animation ;
- conserve les variations de pose (personnage penché, baissé, death, etc.) ;
- aligne les frames sur une baseline commune ;
- recentre horizontalement ;
- reconstruit une spritesheet alpha avec un spacing de sortie standardisé.

Il ne corrige pas :

- une mauvaise animation ;
- une incohérence artistique ;
- un mauvais design d’arme ;
- une pose incorrecte.

La validation artistique reste humaine.

---

## Commande

```powershell
pnpm.cmd generate:spritesheet -- --input="PATH_TO_SOURCE.png" --reference="PATH_TO_REFERENCE.png" --reference-frame=0 --output="PATH_TO_RESULT.png" --frame-count=6 --calibration-frame=0
```

Exemple validé pendant le développement :

```powershell
pnpm.cmd generate:spritesheet -- --input=".tmp/spritesheet-tests/7d5bf8dd-6fe3-4bae-bf01-40dd1b11a384.png" --reference=".tmp/spritesheet-tests/hero-broadsword-attack-sheet-v1.png" --reference-frame=0 --output=".tmp/spritesheet-tests/result.png" --frame-count=6 --calibration-frame=0
```

---

## Paramètres

### `--input`

Spritesheet source à normaliser.

### `--reference`

Image ou spritesheet contenant une frame de référence validée du personnage.

Une spritesheet complète peut servir de référence.

### `--reference-frame`

Index de la frame à utiliser dans la référence.

```text
--reference-frame=0
```

Les index commencent à `0`.

### `--output`

Chemin de sortie du PNG généré.

Si le paramètre n’est pas fourni, l’outil crée un fichier `*-normalized.png` à côté de la source.

### `--frame-count`

Nombre de frames attendu dans la spritesheet source.

```text
--frame-count=6
```

Quand cette valeur est fournie, elle pilote la détection automatique : l’outil recherche les séparateurs transparents les plus pertinents afin de produire exactement ce nombre de frames.

C’est le mode recommandé.

### `--calibration-frame`

Index de la frame source utilisée pour calculer le facteur d’échelle par rapport à la référence.

En général :

```text
--calibration-frame=0
```

Choisir une autre frame si la première est déjà très penchée, couchée ou dans une pose extrême.

### `--reference-frame-count`

Optionnel. Permet de donner explicitement le nombre de frames de la spritesheet de référence si sa détection automatique n’est pas suffisante.

```text
--reference-frame-count=6
```

### `--min-gap`

Seuil de détection de secours utilisé uniquement lorsque `--frame-count` n’est pas fourni.

Valeur par défaut : `64`.

Ce paramètre ne contrôle plus le spacing final de la spritesheet générée.

### `--output-gap`

Spacing horizontal ajouté entre les cellules de sortie.

Valeur par défaut :

```text
64 px
```

Ce paramètre est volontairement séparé de la détection des frames.

### `--alpha-threshold`

Seuil alpha utilisé pour considérer un pixel comme visible.

Valeur par défaut : `8`.

### `--edge-padding`

Marge verticale ajoutée autour de la spritesheet finale.

Valeur par défaut : `8`.

### `--scale`

Force manuellement le facteur d’échelle.

À utiliser uniquement pour diagnostiquer ou traiter un cas exceptionnel. Le mode automatique doit rester la norme.

---

## Fonctionnement

### 1. Normalisation du format

La source et la référence sont converties temporairement en PNG RGBA.

### 2. Détection des frames

L’outil analyse les colonnes contenant des pixels visibles.

Deux modes existent.

#### Mode recommandé : `--frame-count`

Si le nombre de frames est connu, l’outil recherche les zones transparentes internes les plus pertinentes autour des frontières attendues et sélectionne `N - 1` séparateurs pour `N` frames.

Cela évite de dépendre d’un espacement transparent fixe dans la source.

#### Mode fallback

Sans `--frame-count`, l’outil découpe sur les zones transparentes dont la largeur atteint `--min-gap`.

### 3. Mesure du gabarit

L’outil ne se base pas simplement sur la taille totale du PNG.

Il calcule un `body core` autour de la masse centrale du sprite afin de réduire l’impact :

- d’une arme levée ;
- d’un arc ;
- d’une cape ;
- d’une excroissance éloignée du corps.

### 4. Scale unique

Le facteur d’échelle est calculé entre :

- la frame de référence ;
- la frame de calibration source.

Ce facteur est ensuite appliqué à toutes les frames.

L’outil ne redimensionne jamais chaque frame indépendamment.

C’est essentiel pour préserver l’animation.

### 5. Conservation des poses

Une frame où le personnage :

- se penche ;
- baisse la tête ;
- plie les genoux ;
- recule ;
- tombe ;
- est couché pendant une death ;

reste naturellement plus basse ou plus compacte.

L’outil ne tente pas de lui redonner artificiellement la hauteur d’une idle.

### 6. Baseline et ancre horizontale

Chaque frame est replacée selon :

- une baseline commune ;
- une ancre horizontale calculée dans la partie basse du body core.

L’objectif est de limiter le drift du personnage entre les frames sans supprimer le mouvement réel de l’animation.

### 7. Reconstruction

La spritesheet finale est recréée avec :

- fond alpha ;
- échelle cohérente ;
- baseline commune ;
- spacing de sortie indépendant de la détection source ;
- `64 px` de gap par défaut.

---

## Workflow recommandé

1. Préparer une spritesheet source déjà validée artistiquement.
2. Choisir une frame ou spritesheet de référence déjà acceptable en jeu.
3. Identifier le nombre de frames.
4. Choisir une frame de calibration debout ou proche d’une pose neutre.
5. Lancer le générateur avec `--frame-count`.
6. Contrôler visuellement le résultat.

Pour les tests temporaires, utiliser :

```text
.tmp/spritesheet-tests/
```

Exemple :

```text
.tmp/spritesheet-tests/
├── source.png
├── hero-broadsword-attack-sheet-v1.png
└── result.png
```

---

## Contrôle visuel après génération

Le contrôle humain doit vérifier au minimum :

1. **Gabarit** — le personnage correspond bien à la référence en taille générale.
2. **Baseline** — les poses normales ne flottent pas verticalement.
3. **Pose** — les frames penchées ou basses restent naturellement penchées ou basses.
4. **Arme** — l’arme ne provoque pas un scale aberrant.
5. **Drift horizontal** — le personnage ne saute pas artificiellement de gauche à droite.
6. **Spacing** — les sprites restent correctement séparés.
7. **Alpha** — aucun fond parasite n’est introduit.

---

## Cas particuliers

### Personnage qui se penche ou baisse la tête

Ne pas chercher à égaliser sa hauteur apparente avec l’idle.

La règle est :

> même échelle physique, pose conservée.

### Death

Une death couchée ne doit pas être agrandie pour retrouver la hauteur de la référence debout.

Choisir une frame de calibration source suffisamment neutre si possible, puis laisser le scale unique s’appliquer à toute la death.

### Arme très grande

Le calcul du body core limite son influence, mais le résultat doit rester vérifié visuellement.

Si l’arme traverse fortement la zone centrale du corps, elle peut encore influencer la mesure.

### Référence complète

Une spritesheet existante du jeu peut être utilisée directement :

```text
--reference=".../hero-broadsword-attack-sheet-v1.png"
--reference-frame=0
```

Il n’est pas nécessaire d’extraire manuellement la frame.

---

## Dépannage

### `Detected X frames, expected Y`

Avec la version actuelle, `--frame-count=Y` doit normalement piloter le découpage et éviter les anciens problèmes de seuil rigide.

Si le problème persiste :

1. vérifier que des zones réellement transparentes existent entre les sprites ;
2. vérifier le nombre demandé ;
3. regarder si une arme ou un effet relie physiquement deux frames ;
4. ne modifier `--min-gap` que si le mode `--frame-count` n’est pas utilisé.

### Scale refusé comme unsafe

L’outil bloque automatiquement les scales automatiques inférieurs à `0.4` ou supérieurs à `2.5`.

Cela indique généralement :

- mauvaise référence ;
- mauvaise frame de calibration ;
- mauvais découpage ;
- body core faussé par la composition.

Ne pas forcer `--scale` avant d’avoir vérifié ces points.

---

## Philosophie d’architecture

Le SpriteSheet Generator fait partie du tooling existant Albion Idle.

Un agent qui reprend ce chantier doit :

- modifier/améliorer cet outil plutôt que créer un pipeline parallèle ;
- conserver le principe de référence validée ;
- conserver un scale unique par animation ;
- ne jamais normaliser chaque frame indépendamment ;
- ne pas confondre taille brute du fichier et gabarit du personnage ;
- garder le spacing de sortie indépendant de la détection source ;
- considérer la validation artistique comme une responsabilité humaine.

Fichier principal :

```text
packages/tooling/src/bin/generate-spritesheet.ts
```

Commande exposée à la racine :

```text
pnpm generate:spritesheet
```

---

## État validé

Premier test validé visuellement avec :

- source : `7d5bf8dd-6fe3-4bae-bf01-40dd1b11a384.png` ;
- référence : `hero-broadsword-attack-sheet-v1.png` ;
- 6 frames ;
- calibration frame `0` ;
- référence frame `0`.

L’ancien test nécessitait `--min-gap=16` pour détecter les 6 frames. Cette limitation a motivé la détection guidée par `--frame-count` et la séparation entre le gap de détection et le gap de sortie.
