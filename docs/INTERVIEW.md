# Présenter FlowLens en entretien

## Démonstration en trois minutes

1. **Question métier** : comprendre pourquoi des dossiers similaires suivent des chemins et des délais différents.
2. **Vue d’ensemble** : expliquer la différence entre 1,2 million d’événements source et 239 595 états retenus. Montrer le filtre « Pièces manquantes » et son effet sur les indicateurs.
3. **Parcours** : sélectionner une variante, ouvrir un dossier et suivre sa chronologie. Expliquer que les retours sont conservés.
4. **Laboratoire** : passer de 0 % à 25 % après « Dossier complet ». Montrer que l’effet est recalculé dossier par dossier et reste une hypothèse.
5. **Méthode** : citer les 98 dossiers non résolus, les risques de censure et la distinction attente/travail.

## Questions à préparer

**Pourquoi ne pas garder tous les événements dans le graphe ?** La projection rend le processus lisible mais masque les tâches intermédiaires. Elle convient à la question descriptive choisie, pas à une mesure de productivité.

**Pourquoi la médiane ?** Elle décrit le centre d’une distribution asymétrique sans être dominée par quelques longs délais. Le P90 et l’histogramme donnent la dispersion qu’une médiane seule cacherait.

**Une boucle est-elle un défaut ?** Non. Le journal indique un retour, mais il n’en établit pas la cause ou le caractère évitable.

**Comment éviter une fuite temporelle dans une future prédiction ?** Définir un instant de prédiction, construire uniquement les variables observables à cet instant et séparer apprentissage/validation/test par temps de création, en traitant le recouvrement et la censure. Le présent projet ne revendique aucun modèle prédictif.

**Comment passer en production ?** Ajouter ingestion surveillée, contrats de schéma, calculs incrémentaux, stockage adapté, API paginée, contrôles d’accès et supervision. Une démo statique n’est pas une infrastructure de production.

## Travail à s’approprier

Reproduire le pipeline, exécuter les requêtes SQL, expliquer un test de censure, modifier un filtre et recalculer manuellement un petit scénario. Identifier ce que l’on comprend et ce qui a été réalisé avec assistance. Ne pas présenter une maîtrise ou un résultat non acquis.

## Formulation possible pour le CV

« FlowLens — application d’analyse de processus métier : pipeline Python/SQL sur BPI Challenge 2017, exploration interactive de 31 509 dossiers et simulation explicite de scénarios de délai. »

Cette formulation décrit les livrables du projet. Elle ne remplace pas l’appropriation personnelle du code et ne revendique ni mission employeur, ni gain réalisé, ni ancienneté artificielle.
