# Récolte continue — installation

1. Arrêter le serveur avec `Ctrl + C`.
2. Copier le dossier `apps` dans le dossier fusionné `ALBION IDLE`.
3. Accepter la fusion et le remplacement des fichiers.
4. Relancer :

```powershell
pnpm.cmd exec tsc -b
pnpm.cmd dev
```

Le bouton **Récolter le bouleau en continu** démarre désormais une boucle.
Pendant la récolte, le même bouton devient **Arrêter la récolte**.
