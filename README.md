# City Battle

Compare deux villes francaises en mode "battle" avec un affichage anime tale-of-the-tape.

**https://citybattle.jimmydore.fr**

## Stack

HTML, CSS, JavaScript vanilla. Pas de framework, pas de backend.

## Donnees

~35 000 communes francaises (source : opendata.gouv.fr). Un script Node genere le JSON a partir du CSV :

```bash
node scripts/build-data.js
```

## Deploiement

Push sur `main` -> GitHub Actions -> `git pull` sur le VPS via SSH.
