# SpriteSheet Imports

Dossier d'import temporaire pour les spritesheets brutes avant normalisation.

Workflow :

1. créer un sous-dossier par arme : `.tmp/spritesheet-imports/<weaponId>/` ;
2. y déposer les sources nommées `<weaponId>-idle.png`, `<weaponId>-walk.png`, `<weaponId>-attack.png`, `<weaponId>-death.png` selon les animations disponibles ;
3. lancer `pnpm.cmd generate:spritesheet-import -- --weapon=<weaponId>` ;
4. vérifier visuellement les sorties générées dans `apps/client/public/assets/characters/` ;
5. après validation visuelle, faire le câblage jeu.

Voir `docs/tooling/asset-integration-workflow.md` et `docs/tooling/spritesheet-generator.md` pour le détail.
