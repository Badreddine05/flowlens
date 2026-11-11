# Développer et reconstruire FlowLens

## Application

Il faut Node.js 22.12 ou plus récent (ou 24) et npm. Les données préparées sont déjà dans `public/data/`.

```sh
npm ci
npm run dev
```

Vite affiche l'adresse locale à ouvrir. Pour vérifier la version de production :

```sh
npm test
npm run build
npm run preview
```

`dist/` est un site statique. La configuration `base: './'` permet de le servir sous `/flowlens/` comme sous n'importe quel autre sous-chemin.

Une image Docker sert ce site avec Nginx. Le pipeline de données reste une étape séparée.

```sh
docker build -t flowlens .
docker run --rm -p 8080:80 flowlens
```

## Données

Le pipeline n'utilise que la bibliothèque standard de Python 3.11 ou plus récent : il n'y a rien à installer.

```sh
python pipeline/build.py
python -m unittest discover -s tests -p "test_*.py"
```

Il télécharge le fichier XES officiel s'il n'est pas en cache, contrôle son empreinte et son identité, projette les états de la demande (`A_*`), puis écrit :

| Fichier | Contenu |
| --- | --- |
| `public/data/cases.json` | Tous les dossiers, leurs états et des identifiants de substitution |
| `public/data/manifest.json` | Source, citation, empreinte, cardinalités et contrôles |
| `data/processed/flowlens.sqlite` | Tables `cases` et `transitions`, vues analytiques |
| `data/processed/cases.csv` | Export tabulaire pour un outil de BI |

Le fichier brut et la base SQLite ne sont pas versionnés. Une empreinte différente de celle attendue arrête le traitement. L'option `--source` accepte un fichier BPI 2017 local ; les cardinalités attendues restent contrôlées.

```sh
sqlite3 data/processed/flowlens.sqlite < sql/analysis.sql
```

`sqlite3` est facultatif : la base s'ouvre aussi avec Python ou un client SQL. Le CSV ou un connecteur SQLite permettent de l'utiliser dans Power BI ; le dépôt ne contient pas de rapport `.pbix`.

## Organisation du code

| Chemin | Rôle |
| --- | --- |
| `pipeline/build.py` | Téléchargement, lecture du XES, projection, SQLite et JSON |
| `sql/schema.sql`, `sql/analysis.sql` | Modèle relationnel, vues et requêtes d'analyse documentées |
| `src/analytics.mjs` | Filtres, quantiles, graphe, variantes et scénarios |
| `src/main.jsx`, `src/styles.css`, `src/tokens.css` | Interface React, visualisations et identité graphique |
| `public/data/` | Données dérivées et manifeste de provenance |
| `tests/` | Tests des calculs et du parseur |
| `.github/workflows/ci.yml` | Tests Python et JavaScript, puis build, à chaque push et pull request |

## Tests

Les tests couvrent la censure des dossiers ouverts, la conservation des transitions, la composition des filtres, la chronologie en UTC, les retours en vérification, les scénarios sans effet, les doublons exacts et l'absence de colonne sensible dans le jeu publié. La CI utilise les données figées, sans téléchargement externe.

L'interface se pilote au clavier, ferme le détail d'un dossier avec Échap et respecte `prefers-reduced-motion`. L'animation des flux démarre en pause ; sa vitesse ne représente pas les durées réelles.

Voir aussi la [méthodologie](METHODOLOGY.md) et l'[architecture](ARCHITECTURE.md).
