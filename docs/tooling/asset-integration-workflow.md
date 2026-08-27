# Asset Integration Workflow

## TL;DR

Quand l’utilisateur dit :

> je veux travailler sur l’intégration des assets

l’agent doit suivre ce document puis `docs/tooling/spritesheet-generator.md`.

Workflow standard :

1. l’utilisateur dépose les spritesheets brutes directement dans `.tmp/spritesheet-imports/` ;
2. l’agent récupère la branche localement ;
3. l’agent lance l’import automatisé avec `--weapon=<weaponId>` ;
4. l’outil filtre les fichiers correspondant à cette arme, normalise, renomme et dépose les sorties dans `apps/client/public/assets/characters/` ;
5. l’utilisateur vérifie visuellement les sorties générées ;
6. seulement après validation visuelle, l’agent câble les assets dans le jeu.

Le câblage code n’est volontairement pas automatisé.

---

## Ce que fait l’utilisateur

L’utilisateur ne crée pas de sous-dossier par arme et ne manipule pas les fichiers après génération.

Il fait uniquement :

1. déposer les spritesheets brutes dans :

```text
.tmp/spritesheet-imports/
```

2. indiquer à l’agent l’arme et les animations déposées ;
3. vérifier visuellement les fichiers générés après traitement.

Exemple :

```text
.tmp/spritesheet-imports/
├── deathgivers idle.png
├── deathgiver-attack.png
├── permafrost-idle.png
└── permafrost-death.png
```

Puis :

> j’ai déposé deathgiver idle et attack

L’outil appelé avec `--weapon=deathgiver` ignore les fichiers Permafrost.

---

## Convention de nommage des sources

Les fichiers doivent contenir clairement :

- le `weaponId` ;
- le nom de l’animation.

Animations reconnues :

```text
idle
walk
attack
death
```

Le nommage est volontairement tolérant : espaces, underscores et tirets sont normalisés pour la détection.

Exemples acceptés :

```text
deathgiver-idle.png
deathgivers idle.png
deathgiver_attack.png
hero-deathgiver-death-source.png
```

Le wrapper traite uniquement les animations présentes et correspondant à l’arme demandée.

Si plusieurs fichiers correspondent à la même arme + animation, l’outil bloque au lieu de choisir arbitrairement.

---

## Commande standard

```powershell
pnpm.cmd generate:spritesheet-import -- --weapon=deathgiver
```

Par défaut, cela lit directement :

```text
.tmp/spritesheet-imports/
```

Un autre dossier peut être fourni exceptionnellement :

```powershell
pnpm.cmd generate:spritesheet-import -- --weapon=deathgiver --source-dir="mon/dossier"
```

---

## Ce que fait automatiquement l’outil

Pour chaque animation trouvée pour le `weaponId` demandé, le wrapper :

1. filtre les sources du dossier d’import ;
2. détecte `idle`, `walk`, `attack` ou `death` via le nom ;
3. appelle le SpriteSheet Generator existant ;
4. utilise la référence personnage validée ;
5. normalise le gabarit ;
6. conserve un scale unique pour toute l’animation ;
7. conserve les poses ;
8. aligne la baseline ;
9. détecte les frames avec le mode `--frame-count` ;
10. renomme la sortie ;
11. dépose directement la sortie dans le dossier d’assets du jeu.

Sorties :

```text
apps/client/public/assets/characters/hero-<weaponId>-idle-sheet-v1.png
apps/client/public/assets/characters/hero-<weaponId>-walk-sheet-v1.png
apps/client/public/assets/characters/hero-<weaponId>-attack-sheet-v1.png
apps/client/public/assets/characters/hero-<weaponId>-death-sheet-v1.png
```

Seules les animations réellement présentes sont générées.

---

## Référence par défaut

Référence actuelle par défaut :

```text
apps/client/public/assets/characters/hero-broadsword-attack-sheet-v1.png
```

Frame de référence par défaut : `0`.

Nombre de frames de référence par défaut : `6`.

Override possible :

```powershell
pnpm.cmd generate:spritesheet-import -- --weapon=deathgiver --reference="apps/client/public/assets/characters/mon-autre-reference.png" --reference-frame=0 --reference-frame-count=6
```

---

## Frames et calibration

Nombre de frames source par défaut : `6`.

Override global :

```text
--frame-count=5
```

Frame de calibration globale par défaut : `0`.

Override global :

```text
--calibration-frame=1
```

Override par animation :

```text
--idle-calibration-frame=0
--walk-calibration-frame=1
--attack-calibration-frame=0
--death-calibration-frame=0
```

Utiliser un override seulement si la frame `0` est trop penchée, couchée ou extrême pour servir de calibration.

---

## Report de génération

Après traitement, le wrapper écrit un report par arme directement dans le dossier d’import :

```text
.tmp/spritesheet-imports/generation-report-<weaponId>.json
```

Exemple :

```text
.tmp/spritesheet-imports/generation-report-deathgiver.json
```

Le report contient :

- le `weaponId` ;
- la référence utilisée ;
- les fichiers sources ;
- les fichiers générés ;
- le nombre de frames ;
- la frame de calibration ;
- le scale calculé si disponible ;
- la taille de cellule générée si disponible.

L’agent doit consulter ce report avant le câblage.

---

## Vérification visuelle

La vérification visuelle intervient **après** que l’outil a généré les fichiers finaux.

L’utilisateur vérifie :

1. gabarit du personnage ;
2. baseline / pieds ;
3. conservation des poses ;
4. absence de scaling aberrant causé par l’arme ;
5. drift horizontal ;
6. spacing ;
7. alpha.

Si la sortie n’est pas validée, ne pas câbler l’asset dans le jeu.

---

## Câblage jeu

Après validation visuelle, l’agent câble les fichiers générés dans l’architecture existante.

Pour les héros actuels, commencer par :

```text
apps/client/src/game/render/HeroRenderCatalog.ts
```

Vérifier notamment :

- `textureKey` ;
- `assetPath` ;
- `frameRate` ;
- dimensions de frame attendues ;
- `offset` si nécessaire ;
- `visualProfile` et paramètres de rendu existants.

Ne pas créer de pipeline parallèle ou de surcouche spécifique à une arme si l’architecture existante peut être étendue proprement.

---

## Responsabilités

### Utilisateur

- dépose toutes les sources directement dans `.tmp/spritesheet-imports/` ;
- déclenche le chantier avec l’agent ;
- valide visuellement les sorties.

### Outil

- filtre par arme ;
- détecte les animations ;
- normalise ;
- renomme ;
- dépose les assets finaux ;
- produit un report par arme.

### Agent

- lit cette doc ;
- identifie le `weaponId` ;
- lance l’outil ;
- guide la validation visuelle ;
- câble dans le jeu après validation ;
- respecte l’architecture data-driven existante.

---

## Point d’entrée pour un nouvel agent

Si l’utilisateur dit simplement :

> je veux travailler sur l’intégration des assets

l’agent doit immédiatement :

1. lire `docs/tooling/asset-integration-workflow.md` ;
2. lire `docs/tooling/spritesheet-generator.md` ;
3. regarder les fichiers présents dans `.tmp/spritesheet-imports/` ;
4. identifier avec l’utilisateur l’arme concernée ;
5. guider l’utilisateur selon ce workflow sans lui imposer de sous-dossier ou de manipulation manuelle déjà automatisée.
