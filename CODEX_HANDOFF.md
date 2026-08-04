# Albion Idle — Passation Codex

Dernière mise à jour : 29 juillet 2026  
Projet local de référence : `C:\Users\clemd\OneDrive\Bureau\Albion Idle Fusionné\ALBION IDLE`

## 1. Rôle de ce document

Ce document transmet à une autre conversation GPT/Claude :

- l’état fonctionnel actuel d’Albion Idle ;
- les décisions de conception validées avec l’utilisateur ;
- les règles à préserver lors des prochains développements ;
- les changements visibles déjà intégrés ;
- les limitations connues et les travaux volontairement reportés.

Il complète l’AI BIBLE mais ne la remplace pas. En cas de nouvelle fonctionnalité :

1. vérifier d’abord l’AI BIBLE ;
2. respecter les décisions validées dans cette passation ;
3. inspecter le code actuel avant toute modification ;
4. concevoir les règles de manière générique pour les futurs tiers, objets, zones et métiers ;
5. ne pas résoudre uniquement le cas immédiat avec des identifiants codés en dur.

Le code présent dans le dossier local de référence reste la source de vérité technique.

## 2. Méthode de travail demandée

- Une passe doit viser un objectif clairement délimité et produire un résultat visible ou testable.
- Ne pas multiplier les explications répétitives : agir, livrer, puis demander une validation ciblée.
- Pour les changements visuels majeurs, demander une capture du rendu réel.
- Pour les assets importants, présenter le résultat avant intégration lorsque l’utilisateur le demande.
- Ne lancer que les vérifications ciblées nécessaires. L’utilisateur préfère effectuer lui-même les tests fonctionnels dans le jeu.
- Préserver l’architecture data-driven existante.
- Toute nouvelle règle doit être extensible aux futurs tiers et contenus.
- Le responsive doit rester une contrainte permanente pour tous les nouveaux panneaux.

## 3. Architecture générale

Le véritable projet est un monorepo React, TypeScript et Phaser.

Principaux dossiers :

- `apps/client` : interface React, scène Phaser, HUD et panneaux ;
- `apps/server` : serveur ;
- `packages/gameplay` : systèmes de gameplay ;
- `packages/data` : schémas et données ;
- `packages/persistence` : sauvegarde et chargement ;
- `content/data` : recettes, loot et contenu data-driven ;
- `AI_BIBLE` : références de conception.

Lancement local depuis la racine contenant `package.json` :

```powershell
pnpm.cmd install
pnpm.cmd dev
```

Client habituel : `http://localhost:5173/`

Vérification TypeScript ciblée utilisée :

```powershell
pnpm.cmd exec tsc -b --pretty false
```

## 4. Direction visuelle

Direction validée :

- jeu sombre, lisible, avec accents dorés ;
- rendu pixel art cohérent ;
- scène de combat dominante ;
- panneaux moins proches d’un tableau de bord logiciel ;
- monde visible derrière les HUD flottants ;
- menus fonctionnels, compacts et progressivement rapprochés des références Albion fournies par l’utilisateur.

Le fond de combat actuel est un environnement forestier pixel art. Il sert encore à toutes les zones et devra ultérieurement être décliné par biome.

Les monstres récemment produits doivent conserver moins de micro-détails que les premiers essais afin de mieux correspondre à l’échelle réelle du jeu.

## 5. Shell, HUD et navigation

Changements intégrés :

- zone de combat agrandie et visuellement dominante ;
- panneau droit transformé en HUD flottant ;
- progression de zone et frise de segments fusionnées ;
- panneau « Ennemi actuel » retiré ;
- informations inutiles comme l’état textuel et les PV du héros retirées du panneau droit ;
- navigation basse simplifiée ;
- onglet Argent supprimé pour le moment ;
- notifications de loot repositionnées afin de ne plus masquer la frise ;
- possibilité de gérer les notifications ;
- adaptation responsive engagée sur l’ensemble de l’interface.

La frise de progression :

- affiche les segments disponibles, verrouillés, terminés et actifs ;
- permet de sélectionner immédiatement un segment déjà débloqué ;
- ne doit pas attendre la fin du combat en cours pour changer de segment ;
- permet de choisir `Progression` ou `Farm` ;
- permet de parcourir visuellement les autres zones sans déplacement immédiat ;
- le déplacement n’est validé qu’au clic sur un segment ;
- une zone terminée reste accessible ;
- farmer un ancien segment ne doit jamais déverrouiller artificiellement le segment suivant.

## 6. Combat et structure des segments

Règles validées :

- chaque zone comporte désormais 10 segments ;
- chaque segment comporte plusieurs rencontres et se termine selon sa structure configurée ;
- le boss de fin de zone utilise un asset spécifique ;
- les monstres normaux sont actuellement tirés aléatoirement, sans assignation stricte par zone ;
- tous les monstres normaux et mini-boss utilisent une échelle visuelle commune ;
- les boss sont plus imposants et leur barre de vie s’adapte à leur taille ;
- les PV des ennemis persistent au sein d’un même segment ;
- au début d’un nouveau segment, les PV sont réinitialisés ;
- les PV du héros sont restaurés avant un boss ;
- une défaite renvoie à la rencontre 1 du segment concerné ;
- la progression reste arrêtée après une défaite jusqu’à une action explicite du joueur ;
- partir récolter annule réellement le combat en cours ;
- revenir de récolte reprend le dernier segment débloqué en mode Progression, ou le segment sélectionné en mode Farm ;
- le héros ne marche qu’entre deux segments ou lors d’un changement de zone ;
- entre deux ennemis d’un même segment, il reste en animation idle.

Corrections déjà réalisées :

- ennemi bloqué à 0 PV mais continuant d’attaquer ;
- attaques ou compétences partant sur un ennemi déjà mort ;
- doubles attaques normales instantanées ;
- animations d’impact perdues après le premier monstre ;
- changement de segment immédiat ;
- blocage combat/récolte après une défaite ;
- progression incorrecte en mode Farm.

### Défaite et réapparition

Dernière règle intégrée :

- quand le héros meurt, ses PV restent à 0 ;
- son asset de mort reste affiché ;
- aucune résurrection n’a lieu tant que le joueur ne clique pas sur `Reprendre l’exploration` ;
- le clic restaure alors l’état de mort et les PV, puis reprend l’exploration.

Trois assets de mort sont présents :

- `hero-broadsword-death-v1.png` ;
- `hero-fire-staff-death-v1.png` ;
- `hero-badon-death-v1.png`.

## 7. Personnage et animations

Trois profils visuels de référence existent actuellement :

- épée : profil guerrier ;
- bâton de feu : profil mage ;
- arc : profil archer Badon.

Règles temporaires validées :

- toutes les épées utilisent l’asset de l’épée large tant qu’un asset spécifique n’existe pas ;
- tous les bâtons de feu utilisent le profil mage ;
- tous les arcs utilisent le profil Badon ;
- la tête et l’identité du héros doivent rester les mêmes entre les profils ;
- les vêtements et animations changent selon la famille d’arme ;
- la vitesse d’attaque dépend uniquement du type d’arme ;
- le tier, les statistiques et les maîtrises ne doivent pas augmenter la vitesse d’attaque.

Assets existants pour chaque profil :

- idle ;
- walk ;
- attack ;
- death.

Norme obligatoire pour les futurs assets de personnage :

- canevas de référence : `420 × 330 px` par frame ;
- origine Phaser : centre horizontal, pieds/sol en bas ;
- filtre `NEAREST`, sans interpolation ;
- marge inférieure constante ;
- taille visible du corps calibrée sur le profil guerrier, et non sur la largeur totale de l’arme ;
- une arme longue ne doit jamais provoquer la réduction automatique du corps ;
- avant intégration, comparer côte à côte idle, walk, attack et death à leur taille réelle en jeu ;
- les éventuels ajustements de présentation doivent être centralisés par profil, jamais dispersés dans les animations.

Décision importante : abandon de l’approche « pantin » composée de calques. Les prototypes de cette approche ont été supprimés. Les animations seront produites sous forme de véritables planches propres à chaque famille ou arme.

Les animations de combat nécessiteront encore une passe artistique ultérieure, notamment l’attaque à l’épée.

## 8. Compétences et consommables

- Une barre de compétences est visible en combat.
- La compétence principale peut être lancée automatiquement.
- Une infobulle est disponible au survol.
- Les attaques/compétences ne doivent pas cibler un ennemi déjà à 0 PV.
- La potion de soin est accessible depuis le HUD de combat.
- Son soin est exprimé en pourcentage des PV maximum.
- Elle possède un temps de recharge.
- Une infobulle décrit son effet et son cooldown.
- Les potions restent utilisables lorsqu’elles sont empilées.
- L’utilisation depuis l’inventaire est encore autorisée ; les règles fines seront revues plus tard.

## 9. Équipement, inventaire et banque

L’ancien panneau Équipement séparé a été fusionné dans l’onglet Personnage.

L’onglet Personnage contient :

- le portrait/asset idle du profil actuellement équipé ;
- les caractéristiques ;
- l’IP moyen ;
- les emplacements d’équipement ;
- l’inventaire actif ;
- les infobulles détaillées.

Comportements :

- cliquer un emplacement vide ouvre la liste des objets compatibles ;
- cliquer un équipement déjà équipé depuis l’inventaire ouvre les alternatives pour ce slot au lieu de le déséquiper ;
- une arme à deux mains bloque visuellement et fonctionnellement la main gauche ;
- les objets équipés peuvent être retirés ;
- les infobulles doivent être identiques partout où l’objet apparaît ;
- le double-clic peut équiper/utiliser un objet ;
- les équipements identiques sont empilables selon les règles actuelles ;
- équiper une unité d’une pile ne doit pas empêcher l’utilisation des unités restantes ;
- un objet déséquipé doit rejoindre une pile compatible ;
- les objets achetés, craftés et droppés compatibles doivent partager la même logique d’empilement.

L’ancien onglet Inventaire a été renommé `Banque`.

Décision actuelle :

- les objets nouvellement craftés ou obtenus vont dans l’inventaire du personnage ;
- ils ne vont pas directement dans la banque ;
- les ponts entre inventaire et banque seront conçus plus tard ;
- les ressources de production ne doivent apparaître ni comme objets visibles ni comme cases vides dans l’inventaire.

## 10. Statistiques, IP et maîtrise de combat

Les statistiques d’équipement doivent être réellement synchronisées avec le combat, pas seulement affichées dans le panneau.

Correction déjà appliquée aux PV et autres statistiques principales.

Règles IP :

- chaque objet possède un IP de base ;
- maîtrise du tronc commun : `+0,5 IP` par niveau ;
- maîtrise spécifique de l’arme : `+1 IP` par niveau ;
- ce bonus s’ajoute à l’IP existant de l’arme ;
- l’IP augmente la puissance effective de l’arme ;
- la vitesse d’attaque reste toutefois strictement celle du profil d’arme.

La formule actuelle a été pensée pour une progression modérée et devra être rééquilibrée plus tard avec l’ensemble du contenu.

Maîtrises de combat :

- une spécialisation fait progresser son propre niveau ;
- elle fait également progresser sa famille ;
- la famille ne fait jamais progresser rétroactivement toutes ses spécialisations ;
- exemple : l’Épée large donne de l’XP à `Épée large` et à `Épées`, mais l’XP du tronc `Épées` ne donne pas d’XP aux autres épées.

Le panneau Maîtrises actuel :

- liste des familles à gauche ;
- détail de la famille sélectionnée au centre ;
- spécialisations imbriquées ;
- état et prochaines récompenses à droite ;
- séparation visuelle entre maîtrises de combat et de récolte.

Le contenu complet prévu par l’AI BIBLE n’est pas encore implémenté.

## 11. Production : récolte, raffinage et craft

L’onglet Production regroupe :

- Récolte ;
- Raffinage ;
- Craft.

Ressources intégrées :

- bois ;
- minerai ;
- peaux ;
- fibres.

Produits raffinés :

- planches ;
- lingots ;
- cuir ;
- tissu.

Tiers actuels :

- T3 ;
- T4.

Règles génériques validées :

- le rendement de chaque cycle de récolte est de 1 ressource ;
- les cycles sont volontairement longs ;
- le héros récolte toujours plus vite qu’un worker comparable ;
- le héros ne peut récolter qu’une ressource à la fois ;
- partir récolter suspend l’activité de combat en l’annulant proprement ;
- un clic lance la récolte continue ;
- un second clic l’arrête ;
- le raffinage continu s’arrête proprement si les ressources sont insuffisantes.

Recettes de raffinage :

- T3 : ressources brutes T3 uniquement ;
- T4 : produit raffiné T3 + ressource brute T4 ;
- cette logique doit s’étendre aux futurs tiers.

Craft :

- un objet T4 exige des composants raffinés T4 ;
- équipements T3 et T4 disponibles ;
- familles de sélection : Offhand, Arc, Épée, Bâton de feu, Tête, Torse, Bottes ;
- le sélecteur affiche d’abord une famille, puis ses objets ;
- l’infobulle détaillée est volontairement désactivée dans la sélection de recette elle-même.

Les monstres ne droppent actuellement plus d’équipement standard. Les futurs drops d’objets devront être rares et spécifiques, par exemple des objets de boss.

## 12. Workers et maîtrises de récolte

Le socle workers était déjà présent dans le code initial et a été exposé dans le jeu.

Workers actuels :

- bûcheron ;
- mineur ;
- tanneur/dépeceur selon la terminologie UI ;
- récolteur de fibres.

Règles :

- chaque worker ne travaille que sur la ressource et le tier sélectionnés pour lui ;
- son affichage doit montrer exactement ce qu’il récolte ;
- sa progression de maîtrise est indépendante de celle du héros ;
- le worker apporte toutefois de l’XP à la maîtrise globale du héros ;
- l’inverse est interdit ;
- une maîtrise est globale à un métier, et non séparée par tier ;
- récolter un tier supérieur donne davantage d’XP ;
- la maîtrise du héros réduit son temps de récolte ;
- la maîtrise du worker réduit également son propre temps de récolte ;
- la maîtrise worker progresse beaucoup plus lentement.

Déblocage T4 :

- le T3 est accessible au niveau 0 ;
- le T4 est débloqué au niveau 3 de la maîtrise concernée ;
- cette règle s’applique au héros comme au worker ;
- l’XP fournie par le worker au héros contribue au déblocage du héros.

Présentation souhaitée dans Maîtrises :

- menu métier à gauche : Bûcheron, Mineur, etc. ;
- au centre, pour le métier sélectionné :
  - maîtrise du héros ;
  - maîtrise du ou des workers associés.

## 13. Marchand

Les onglets Vendeur et Réparer ont été fusionnés dans `Marchand`.

Le marchand :

- vend uniquement des potions pour le moment ;
- sépare clairement achat et vente ;
- permet de choisir la quantité achetée ;
- remet la quantité à 1 après achat ;
- permet de vendre une quantité donnée ;
- permet de tout vendre ;
- propose un bouton de réparation ;
- affiche les infobulles des objets et consommables.

Les ressources de production ne doivent pas être vendues comme des objets d’inventaire ordinaires.

## 14. Zones, difficulté et boucle de progression

Premier monde actuellement disponible :

- Forest ;
- Swamp ;
- Highland ;
- Steppe ;
- Mountain.

Chaque zone contient 10 segments.

La philosophie de progression validée est :

1. commencer avec un équipement minimal T3 ;
2. combattre jusqu’à une difficulté bloquante ;
3. retourner en production ;
4. récolter, raffiner et crafter un équipement T3 plus complet ;
5. reprendre la progression ;
6. passer progressivement vers le T4 sur l’ensemble des cinq zones ;
7. utiliser les compétences, potions et maîtrises pour compenser partiellement un déficit d’IP.

Important : la progression `rien → full T3 → full T4` doit s’étaler sur toutes les zones du premier monde, pas uniquement Forest.

Les valeurs d’IP recommandé ont été augmentées et vont actuellement approximativement de 220 à 600 sur ce monde. La difficulté a été augmentée en parallèle, mais l’équilibrage reste provisoire et sera repris plus tard.

Test utilisateur historique ayant motivé le recalibrage :

- arme de départ seule + compétence auto : progression auparavant jusqu’au segment 8 ;
- full T3 : progression seulement légèrement améliorée ;
- arme T4 avec reste T3 : fin de zone trop facile.

Ce comportement a été jugé incorrect. La courbe actuelle est une base, pas une validation définitive.

## 15. Récompenses et estimations horaires

Les gains par monstre ne sont plus aléatoires :

- silver fixe par type de rencontre ;
- fame fixe par type de rencontre ;
- progression croissante selon zone et segment.

Le panneau Informations affiche des prévisions :

- silver/heure ;
- fame/heure.

Ces valeurs sont des estimations selon :

- puissance effective du héros ;
- temps estimé pour tuer les monstres ;
- puissance du segment ;
- gains fixes par monstre.

Elles ne doivent pas fluctuer à cause d’une fenêtre de mesure glissante aléatoire. Leur affichage utilise des formats compacts tels que `15K`.

## 16. Monstres et assets actuels

Assets intégrés :

- guerrier mort-vivant historique ;
- Stonefang Wolf ;
- Razorwing Harpy ;
- Morgana Witch ;
- Ancient Mountain Golem pour les boss de fin de zone.

Règles temporaires :

- les monstres normaux sont sélectionnés aléatoirement ;
- le golem est utilisé comme boss de fin de zone ;
- l’assignation précise des familles de monstres par biome viendra plus tard.

## 17. Points volontairement reportés

- équilibrage final de la difficulté et de l’IP recommandé ;
- contenu complet des maîtrises selon l’AI BIBLE ;
- animations finales de toutes les familles d’armes ;
- assets de combat propres à chaque arme individuelle ;
- fonds spécifiques pour chaque biome ;
- ponts inventaire ↔ banque ;
- règles avancées d’utilisation des potions ;
- objets rares et drops spécifiques de boss ;
- plusieurs workers par métier ;
- amélioration finale du responsive sur toutes les résolutions ;
- polish sonore, VFX et shaders ;
- attribution précise des monstres aux zones.

## 18. Prototypes abandonnés à ne pas réintroduire

- personnage construit comme un pantin composé de calques ;
- ancien héros générique apparaissant entre deux animations ;
- panneaux Équipement et Personnage séparés ;
- onglet Réparer séparé du marchand ;
- panneau Ennemi actuel occupant une grande partie du HUD ;
- ressources de production stockées visuellement dans l’inventaire ;
- drops fréquents d’équipements standards par les monstres ;
- progression de segment automatique provoquée par le farm d’un ancien segment ;
- résurrection automatique avant validation du joueur.

## 19. Fichiers particulièrement importants

Client :

- `apps/client/src/game/GameScene.ts`
- `apps/client/src/game/GameBridge.ts`
- `apps/client/src/state/GameContext.tsx`
- `apps/client/src/state/bridgeSync.ts`
- `apps/client/src/hud/SegmentTimeline.tsx`
- `apps/client/src/hud/AbilityBar.tsx`
- `apps/client/src/layout/RightSidebar.tsx`
- `apps/client/src/layout/BottomNav.tsx`
- `apps/client/src/panels/CharacterPanel.tsx`
- `apps/client/src/panels/InventoryPanel.tsx`
- `apps/client/src/panels/GatheringPanel.tsx`
- `apps/client/src/panels/VendorPanel.tsx`
- `apps/client/src/panels/ProgressionPanel.tsx`
- `apps/client/src/panels/ItemTooltip.tsx`
- `apps/client/src/panels/ItemHoverTooltip.tsx`
- `apps/client/src/panels/ItemVisual.tsx`
- `apps/client/src/styles.css`
- `apps/client/src/theme/theme.css`

Gameplay et données :

- `packages/gameplay/src/combat/combat-service.ts`
- `packages/gameplay/src/auto-attack/attack-timer.ts`
- `packages/gameplay/src/equipment/equipment-manager.ts`
- `packages/gameplay/src/inventory/inventory-manager.ts`
- `packages/gameplay/src/worker-execution/worker-executor.ts`
- `content/data/recipes.json`
- `content/data/loot_tables.json`

Assets :

- `apps/client/public/assets/characters`
- `apps/client/public/assets/monsters`
- `apps/client/public/assets/resources`

## 20. Instruction de reprise recommandée

Message à donner à la conversation qui reprend le projet :

> Lis intégralement `CODEX_HANDOFF.md`, puis consulte l’AI BIBLE et le code actuel avant toute modification. Considère le dossier local/ZIP le plus récent comme source de vérité technique. Préserve toutes les décisions validées dans la passation. Pour chaque nouvelle fonctionnalité, construis une règle générique compatible avec les futurs tiers et contenus, apporte un changement ciblé, puis demande une validation visuelle ou fonctionnelle.
