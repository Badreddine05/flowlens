# FlowLens

**Comprendre les parcours métier, repérer les retours et explorer les délais.**

FlowLens est une application de process mining sur le journal réel **BPI Challenge 2017**. Elle associe un pipeline Python reproductible, un modèle SQL et une interface React interactive. Le cas d’étude porte sur les demandes de prêt d’un établissement financier néerlandais.

[Ouvrir la démonstration](https://Badreddine05.github.io/flowlens/) · [Données originales](https://doi.org/10.4121/uuid:5f3067df-f10b-45da-b98b-86ae4c7a310b) · [Méthodologie](docs/METHODOLOGY.md) · [Architecture](docs/ARCHITECTURE.md)

## Ce que l’on peut explorer

- **Vue d’ensemble** : dossiers, délai médian, 90e percentile, retours en vérification, issues et cohortes mensuelles.
- **Graphe de processus** : transitions réellement observées entre états de la demande, épaisseur proportionnelle au volume, filtre par étape et animation activable. La couverture de la simplification est affichée.
- **Parcours et dossiers** : variantes exactes, recherche, tri, pagination et chronologie d’un dossier avec dates UTC.
- **Laboratoire** : scénario explicite de réduction d’une partie des intervalles après une étape. Comparaison des distributions et export des hypothèses.
- **Données et méthode** : source, empreinte, contrôles, définitions, censure et limites d’interprétation.
- **Exports CSV** : dossiers du périmètre courant et hypothèses du scénario. Les filtres mois/type/issue/étape se combinent.

Les calculs restent dans le navigateur. Aucun compte, clé API, suivi publicitaire ou service payant n’est nécessaire. Les polices sont embarquées ; la démonstration n’appelle aucune API tierce.

## Résultats du jeu figé

| Mesure | Valeur | Périmètre |
| --- | ---: | --- |
| Dossiers | 31 509 | Tous les dossiers de la source |
| Événements source | 1 202 267 | Application + Offer + Workflow |
| États Application conservés | 239 595 | Projection utilisée dans l’interface |
| Dossiers à issue connue | 31 411 | Dernier état Pending, Denied ou Cancelled |
| Dossiers sans issue connue | 98 | Exclus des indicateurs de délai terminé |
| Délai médian | 19,07 jours | Dossiers à issue connue |
| 90e percentile du délai | 34,99 jours | Dossiers à issue connue |
| Variantes de parcours | 102 | Séquences d’états Application |
| Nouvelle vérification | 11 669 dossiers | Plus d’un passage par A_Validating |

Ce sont des résultats descriptifs du journal historique. Aucun gain commercial, résultat de production ou effet causal n’est revendiqué.

## Démarrage

Prérequis : **Node.js 22.12+** (ou 24) et npm. Python **3.11+** est requis uniquement pour reconstruire les données et tester le parseur.

```sh
npm ci
npm run dev
```

Ouvrir l’URL locale affichée par Vite. Le jeu de démonstration est déjà présent dans `public/data/`.

```sh
npm test
python -m unittest discover -s tests -p "test_*.py"
npm run build
npm run preview
```

Le build est un site statique dans `dist/`. La configuration `base: './'` permet l’hébergement sous `/flowlens/` et sur un autre sous-chemin.

### Docker

```sh
docker build -t flowlens .
docker run --rm -p 8080:80 flowlens
```

L’interface est servie sur `http://localhost:8080`. Le pipeline de données reste une étape séparée.

## Reconstruire le jeu de données

Le pipeline utilise uniquement la bibliothèque standard Python : aucune dépendance à installer.

```sh
python pipeline/build.py
```

Il télécharge le fichier XES gzip officiel si le cache est absent, contrôle son empreinte et son identité, projette les états Application, puis écrit :

| Fichier | Contenu |
| --- | --- |
| `public/data/cases.json` | Tous les dossiers, états métier et identifiants de substitution |
| `public/data/manifest.json` | Source, citation, empreinte, cardinalités et contrôles |
| `data/processed/flowlens.sqlite` | Tables `cases`, `transitions` et vues analytiques |
| `data/processed/cases.csv` | Export tabulaire pour outils BI |

Le fichier brut et la base SQLite sont ignorés par Git. Une empreinte différente provoque une erreur explicite. L’option `--source` permet de fournir un fichier local BPI 2017 ; les cardinalités attendues restent contrôlées.

```sh
sqlite3 data/processed/flowlens.sqlite < sql/analysis.sql
```

`sqlite3` est optionnel : la base peut être ouverte avec Python ou un client SQL. Le modèle est également exploitable dans Power BI à partir du CSV ou d’un connecteur SQLite ; aucun rapport `.pbix` n’est revendiqué ici.

## Structure

```text
pipeline/build.py           téléchargement, parsing XES, projection, SQLite et JSON
sql/schema.sql              modèle relationnel et vues
sql/analysis.sql            requêtes d’analyse documentées
src/analytics.mjs           filtres, quantiles, graphe, variantes et scénarios
src/main.jsx                interface React et composants de visualisation
src/styles.css              design responsive et mouvement réduit
public/data/                données dérivées et manifeste de provenance
tests/                      tests analytiques, conservation et parseur
docs/                       méthode, architecture et préparation à l’entretien
.github/workflows/ci.yml     tests Python/JavaScript et build sur chaque push/PR
```

## Qualité et accessibilité

Les tests couvrent notamment la censure, la conservation des transitions, la composition des filtres, la chronologie UTC, les retours en vérification, les scénarios sans effet, les doublons exacts et l’absence de colonnes sensibles dans le jeu public. La CI utilise les données figées, sans téléchargement externe.

Navigation clavier, labels de formulaires, états vides, focus visible, fermeture du détail avec Échap et prise en compte de `prefers-reduced-motion`. Les flux sont en pause au démarrage. Leur animation n’utilise pas les durées réelles et ne doit pas être interprétée comme une simulation temporelle.

## Limites et choix

- La projection exclut les activités Offer et Workflow : elle simplifie le processus et ne permet pas une analyse de charge des employés.
- Le temps entre états mélange attente et travail. Les délais sont calendaires, pas des jours ouvrés.
- Les dossiers sans issue connue sont exclus des quantiles terminés. Cette exclusion ne supprime pas le biais de censure des cohortes récentes.
- A_Pending est présenté « À financer ». Il ne prouve pas un décaissement.
- Une nouvelle vérification décrit un retour ; elle n’établit ni erreur ni défaut.
- Le laboratoire retranche mathématiquement des intervalles. Il ne modélise ni ressources, ni capacité, ni changement d’issue, ni coût. Il n’est pas un modèle prédictif.
- Le chargement initial comprend les 31 509 dossiers ; une version à plus grande échelle nécessiterait une API agrégée, une pagination serveur et un moteur de calcul dédié.

## Auteur, contribution et licence

Projet personnel de **Badreddine Channoufi** — [GitHub](https://github.com/Badreddine05). Réalisation avec assistance de Codex, explicitée dans les choix techniques et les tests. L’historique Git correspond aux étapes réelles de réalisation ; les dates 2016–2017 décrivent uniquement le jeu source.

Code original : **MIT**. Données et dérivés : **4TU General Terms of Use**, avec attribution et réutilisation non commerciale ; ils ne relèvent pas de la licence MIT du code. Consulter [DATA_LICENSE.md](DATA_LICENSE.md) et [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

**Source** : van Dongen, Boudewijn (2017): *BPI Challenge 2017*. Version 1. 4TU.ResearchData. [DOI](https://doi.org/10.4121/uuid:5f3067df-f10b-45da-b98b-86ae4c7a310b).

## English overview

FlowLens is a reproducible process-intelligence portfolio project built on the full BPI Challenge 2017 log. A Python pipeline projects application-state transitions into SQLite and a static JSON artifact; React computes interactive filters, directly-follows graphs, trace variants, elapsed-time distributions and explicit what-if scenarios. This is a historical, non-commercial research demonstration, not a production credit decision system.
