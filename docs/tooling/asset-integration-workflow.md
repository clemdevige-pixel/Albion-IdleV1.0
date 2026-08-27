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

## Contrat de taille

La référence globale est l’unique autorité de gabarit pour Albion Idle.

Toutes les armes doivent converger vers ce même gabarit.

Les différentes animations d’une même arme sont supposées être générées à la même échelle brute. Pour éviter qu’une pose d’attaque, une arme ou une cape ne produise un scale différent selon la spritesheet, le wrapper calcule **un seul scale par arme** :

1. il privilégie `idle` comme animation de calibration si elle existe ;
2. cette animation est mesurée contre la référence globale ;
3. le scale obtenu devient `sharedScale` ;
4. `walk`, `attack` et `death` réutilisent exactement ce `sharedScale`.

Ainsi, la référence globale fixe toujours la taille cible, mais une même arme ne peut plus dériver en taille d’une animation à l’autre.

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

Pour le `weaponId` demandé, le wrapper :

1. filtre les sources du dossier d’import ;
2. détecte `idle`, `walk`, `attack` ou `death` via le nom ;
3. choisit l’animation de calibration (`idle` en priorité) ;
4. calibre cette animation contre la référence personnage globale ;
5. récupère le `sharedScale` ainsi calculé ;
6. applique exactement ce même `sharedScale` à toutes les autres animations de l’arme ;
7. conserve les poses ;
8. aligne la baseline ;
9. détecte les frames avec le mode `--frame-count` ;
10. renomme les sorties ;
11. dépose directement les sorties dans le dossier d’assets du jeu.

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

Important : seul le scale de l’animation de calibration choisie par le wrapper sert à définir la taille de l’arme. Les autres frames de calibration servent encore aux métriques/ancrages internes, mais ne peuvent plus modifier la taille physique de l’animation.

---

## Report de génération

Après traitement, le wrapper écrit un report par arme directement dans le dossier d’import :

```text
.tmp/spritesheet-imports/generation-report-<weaponId>.json
```

Le report contient notamment :

- le `weaponId` ;
- la référence utilisée ;
- `calibrationAnimation` ;
- `sharedScale` ;
- les fichiers sources ;
- les fichiers générés ;
- le nombre de frames ;
- les tailles de cellule générées.

L’agent doit vérifier que toutes les animations du report ont le même `scale` avant le câblage.

---

## Vérification visuelle

La vérification visuelle intervient **après** que l’outil a généré les fichiers finaux.

L’utilisateur vérifie :

1. gabarit du personnage par rapport à la référence ;
2. cohérence de taille entre idle / walk / attack / death ;
3. baseline / pieds ;
4. conservation des poses ;
5. absence de scaling aberrant causé par l’arme ;
6. drift horizontal ;
7. spacing ;
8. alpha.

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
- calibre l’arme contre la référence globale ;
- impose un scale commun à toutes les animations de l’arme ;
- normalise ;
- renomme ;
- dépose les assets finaux ;
- produit un report par arme.

### Agent

- lit cette doc ;
- identifie le `weaponId` ;
- lance l’outil ;
- vérifie le report ;
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
