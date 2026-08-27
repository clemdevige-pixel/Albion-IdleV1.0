# Asset Integration Workflow

## TL;DR

Quand l’utilisateur dit :

> je veux travailler sur l’intégration des assets

l’agent doit suivre ce document puis `docs/tooling/spritesheet-generator.md`.

Workflow standard :

1. l’utilisateur dépose les spritesheets brutes sur GitHub dans `.tmp/spritesheet-imports/<weaponId>/` ;
2. l’agent récupère la branche localement ;
3. l’agent lance l’import automatisé ;
4. l’outil normalise, renomme et dépose les sorties dans `apps/client/public/assets/characters/` ;
5. l’utilisateur vérifie visuellement les sorties générées ;
6. seulement après validation visuelle, l’agent câble les assets dans le jeu.

Le câblage code n’est volontairement pas automatisé.

---

## Ce que fait l’utilisateur

L’utilisateur ne manipule pas les fichiers après génération.

Il fait uniquement :

1. créer ou utiliser un dossier d’import GitHub :

```text
.tmp/spritesheet-imports/<weaponId>/
```

2. déposer les spritesheets brutes ;
3. indiquer à l’agent l’arme et les animations déposées ;
4. vérifier visuellement les fichiers générés après traitement.

Exemple :

```text
.tmp/spritesheet-imports/deathgiver/
├── deathgiver-idle.png
└── deathgiver-attack.png
```

Puis :

> j’ai déposé deathgiver idle et deathgiver attack

---

## Convention de nommage des sources

Les fichiers doivent contenir :

- le `weaponId` ;
- le nom de l’animation.

Animations reconnues :

```text
idle
walk
attack
death
```

Exemples acceptés :

```text
deathgiver-idle.png
deathgiver-attack.png
hero-deathgiver-death-source.png
```

Le wrapper traite uniquement les animations présentes dans le dossier.

---

## Commande standard

Par défaut, le dossier source est déduit du `weaponId` :

```powershell
pnpm.cmd generate:spritesheet-import -- --weapon=deathgiver
```

Cela lit :

```text
.tmp/spritesheet-imports/deathgiver/
```

Un dossier différent peut être fourni :

```powershell
pnpm.cmd generate:spritesheet-import -- --weapon=deathgiver --source-dir=".tmp/spritesheet-imports/deathgiver"
```

---

## Ce que fait automatiquement l’outil

Pour chaque animation trouvée, le wrapper :

1. détecte le fichier source ;
2. appelle le SpriteSheet Generator existant ;
3. utilise la référence personnage validée ;
4. normalise le gabarit ;
5. conserve un scale unique pour toute l’animation ;
6. conserve les poses ;
7. aligne la baseline ;
8. détecte les frames avec le mode `--frame-count` ;
9. renomme la sortie ;
10. dépose directement la sortie dans le dossier d’assets du jeu.

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

Frame de référence par défaut :

```text
0
```

Nombre de frames de référence par défaut :

```text
6
```

Override possible :

```powershell
pnpm.cmd generate:spritesheet-import -- --weapon=deathgiver --reference="apps/client/public/assets/characters/mon-autre-reference.png" --reference-frame=0 --reference-frame-count=6
```

---

## Frames et calibration

Nombre de frames source par défaut :

```text
6
```

Override global :

```text
--frame-count=5
```

Frame de calibration globale par défaut :

```text
0
```

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

Après traitement, le wrapper écrit :

```text
.tmp/spritesheet-imports/<weaponId>/generation-report.json
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

- dépose les sources sur GitHub ;
- déclenche le chantier avec l’agent ;
- valide visuellement les sorties.

### Outil

- détecte ;
- normalise ;
- renomme ;
- dépose les assets finaux ;
- produit le report.

### Agent

- lit cette doc ;
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
3. identifier le dossier `.tmp/spritesheet-imports/<weaponId>/` concerné ;
4. guider l’utilisateur selon ce workflow sans lui faire refaire des manipulations manuelles déjà automatisées.
