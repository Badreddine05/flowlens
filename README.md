<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/readme/flowlens-dark.png">
  <img alt="Application FlowLens : la carte des étapes d'une demande de prêt, avec l'épaisseur des transitions proportionnelle au nombre de dossiers" src=".github/readme/flowlens-light.png">
</picture>

# FlowLens

Le parcours de 31 509 demandes de prêt, reconstitué étape par étape à partir d'un journal d'événements public : le BPI Challenge 2017, publié par une banque néerlandaise pour la recherche en process mining.

**[Ouvrir l'application](https://badreddine05.github.io/flowlens/)** · [Lire l'étude de cas](https://badreddine05.github.io/projets/flowlens/) · [Méthodologie](docs/METHODOLOGY.md)

## Ce que l'on peut faire

L'application tourne entièrement dans le navigateur, sans compte ni serveur. Elle permet de :

- voir les dix étapes d'une demande et les transitions observées entre elles, avec une épaisseur proportionnelle au nombre de dossiers ;
- comparer les 102 parcours différents, du plus fréquent au plus rare ;
- chercher un dossier et lire sa chronologie complète, dates à l'appui ;
- filtrer par mois, type de demande, issue ou étape, puis exporter les dossiers retenus en CSV ;
- tester un scénario : retirer une part du temps passé après une étape et regarder l'effet sur les délais.

Un onglet « Données et méthode » rappelle la source, l'empreinte du fichier, les contrôles effectués et les définitions.

## Ce que montrent les données

- Les dix parcours les plus fréquents couvrent 77,8 % des dossiers. Le premier, 6 840 dossiers à lui seul, se termine par une annulation juste après « dossier complet ».
- La durée médiane d'une demande terminée est de 19,1 jours. Les demandes financées ou refusées se règlent en deux semaines environ, alors que les annulations forment un pic net autour de 30 jours.
- 70 % du temps cumulé s'écoule après « dossier complet », l'étape qui précède le retour de l'offre signée par le client.
- 11 669 dossiers repassent plusieurs fois par la vérification. Leur durée médiane est plus courte que celle des autres, parce qu'ils sont presque toujours financés et rarement annulés.

Ces constats décrivent un journal historique. Le projet ne mesure ni gain commercial ni effet causal.

## Lancer le projet

Il faut Node.js 22.12 ou plus récent. Les données préparées sont déjà dans `public/data/`.

```sh
npm ci
npm run dev
```

Ouvrez ensuite l'adresse affichée par Vite. Pour la version de production :

```sh
npm test
npm run build
npm run preview
```

`dist/` est un site statique, utilisable sous un sous-chemin (`base: './'`). Une image Docker sert ce site avec Nginx :

```sh
docker build -t flowlens .
docker run --rm -p 8080:80 flowlens
```

## Reconstruire les données

Le pipeline n'utilise que la bibliothèque standard de Python 3.11 ou plus récent. Il télécharge le fichier XES officiel s'il n'est pas en cache, vérifie son empreinte et ses cardinalités, puis écrit :

| Fichier | Contenu |
| --- | --- |
| `public/data/cases.json` | Tous les dossiers, leurs états et des identifiants de substitution |
| `public/data/manifest.json` | Source, citation, empreinte et résultats des contrôles |
| `data/processed/flowlens.sqlite` | Tables `cases` et `transitions`, vues analytiques |
| `data/processed/cases.csv` | Export tabulaire pour un outil de BI |

```sh
python pipeline/build.py
python -m unittest discover -s tests -p "test_*.py"
sqlite3 data/processed/flowlens.sqlite < sql/analysis.sql
```

Le fichier brut et la base SQLite ne sont pas versionnés. Une empreinte différente de celle attendue arrête le traitement.

## Pour les développeurs

| Chemin | Rôle |
| --- | --- |
| `pipeline/build.py` | Téléchargement, lecture du XES, projection, SQLite et JSON |
| `sql/` | Modèle relationnel, vues et requêtes d'analyse |
| `src/analytics.mjs` | Filtres, quantiles, graphe, variantes et scénarios |
| `src/main.jsx`, `src/styles.css` | Interface React et visualisations |
| `tests/` | Tests du parseur et des calculs |
| `docs/` | [Méthodologie](docs/METHODOLOGY.md) et [architecture](docs/ARCHITECTURE.md) |

Les tests couvrent la censure des dossiers ouverts, la conservation des transitions, la composition des filtres, la chronologie en UTC, les retours en vérification et l'absence de colonne sensible dans le jeu publié. La CI GitHub Actions les exécute sur chaque push, avec les données figées.

## Limites

- Seuls les états de la demande sont conservés : les activités liées aux offres et aux employés sont écartées, ce qui empêche toute analyse de charge.
- Les délais sont calendaires et mélangent attente et travail.
- « À financer » correspond à l'état `A_Pending` et ne prouve pas que le prêt a été versé.
- Le laboratoire retranche des intervalles de façon mécanique. Il ne modélise ni les ressources, ni la capacité, ni l'issue des dossiers.

## Données, licences et crédits

Données : van Dongen, B. (2017). *BPI Challenge 2017*. Version 1. 4TU.ResearchData. [doi:10.4121/uuid:5f3067df-f10b-45da-b98b-86ae4c7a310b](https://doi.org/10.4121/uuid:5f3067df-f10b-45da-b98b-86ae4c7a310b). Les données et leurs dérivés relèvent des conditions générales de 4TU (attribution, usage non commercial), pas de la licence du code : voir [DATA_LICENSE.md](DATA_LICENSE.md).

Code sous licence [MIT](LICENSE). Les polices Newsreader, IBM Plex Sans et IBM Plex Mono (SIL OFL 1.1) et les licences de React et Lucide sont dans [`public/licenses/`](public/licenses/) et accompagnent chaque build ; détail dans [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Projet personnel de [Badreddine Channoufi](https://badreddine05.github.io/), réalisé avec l'aide d'outils d'IA. Les dates 2016 et 2017 décrivent le jeu de données, pas la réalisation du projet.

## In English

FlowLens rebuilds the path of each of the 31,509 loan applications in the public BPI Challenge 2017 event log. A standard-library Python pipeline projects application states into SQLite and a static JSON file; a React app shows the process map, trace variants, durations, case timelines and explicit what-if scenarios, all in the browser. It is a descriptive, non-commercial study of a historical log.
