# Méthodologie

## Question métier

Comment rendre lisible le cheminement des demandes et examiner les écarts de délai, sans confondre temps écoulé, charge de travail et causalité ?

## Unité d’analyse

Un dossier correspond à une trace du journal BPI Challenge 2017. La source complète contient 31 509 traces et 1 202 267 événements. FlowLens conserve les 239 595 événements dont le nom commence par `A_`, représentant les états de la demande. Les familles `O_` et `W_` ne sont pas présentes dans la vue publique.

Les identifiants Application et Resource originaux ne sont pas exportés. Un identifiant `FL-00001` est affecté suivant l’ordre du fichier officiel. Les montants et scores de crédit ne sont pas collectés dans le modèle public.

## Ordre, temps et qualité

Chaque timestamp doit porter un fuseau. Les instants sont convertis en UTC et triés de manière stable au sein de la trace. Les égalités temporelles conservent l’ordre source. Un doublon est défini uniquement par le même état au même instant, adjacent après tri. Un second passage à une autre date est conservé.

Le fichier observé ne contient ni état Application inconnu, ni trace à réordonner, ni doublon exact à retirer. Le manifeste contient l’empreinte SHA-256 du fichier gzip, sa taille et les compteurs. Le pipeline échoue en cas de changement d’empreinte ou de cardinalité inattendue.

## Indicateurs

| Indicateur | Définition |
| --- | --- |
| Dossiers explorés | Nombre de traces satisfaisant tous les filtres globaux |
| Issue connue | Dernier état égal à A_Pending, A_Denied ou A_Cancelled |
| Délai observé | Dernier timestamp Application moins premier timestamp Application |
| Médiane / P90 | Quantile linéaire des délais des dossiers à issue connue |
| Nouvelle vérification | Trace avec plus d’une occurrence de A_Validating |
| Variante | Séquence complète des identifiants d’états, répétitions conservées |
| Transition | Deux états consécutifs de la projection Application |
| Volume du nœud | Nombre de dossiers distincts passés au moins une fois par l’état |
| Volume de l’arête | Nombre de passages, potentiellement plusieurs par dossier |

Les calculs sont effectués à la demande à partir de toutes les traces du périmètre sélectionné. Le filtre d’étape sélectionne les dossiers qui ont visité cet état puis garde leur parcours complet. Il ne coupe pas les traces au nœud sélectionné.

## Simplification graphique

Par défaut, les 12 transitions les plus fréquentes sont affichées ; la part des passages représentés est calculée et visible. Le bouton « Toutes les transitions » affiche le graphe complet. Les positions des nœuds sont fixes pour préserver les repères entre filtres. L’épaisseur des arêtes dépend du volume.

L’animation illustre une circulation sur les arêtes observées. Elle n’anime pas un dossier individuel et ne représente ni vitesse réelle, ni prévision. Elle est désactivée par défaut et avec le mouvement réduit.

## Censure et interprétation

98 traces n’ont pas d’état final reconnu. Elles restent dans les dénombrements et les parcours, mais pas dans les quantiles des dossiers terminés. Les dossiers créés près de la fin d’observation peuvent avoir moins de temps pour atteindre une issue : les cohortes mensuelles ne sont donc pas une comparaison causale de performance.

La transition A_Complete → A_Cancelled concentre un délai médian élevé. Le journal seul ne permet pas d’affirmer qu’il s’agit d’un blocage interne : il peut s’agir d’un délai d’expiration, d’un choix client ou d’autres causes. FlowLens présente une observation, pas un diagnostic certain.

## Laboratoire de scénarios

Pour chaque dossier terminé, on somme les intervalles qui suivent l’état sélectionné, puis on applique :

```text
nouveau délai = délai observé − réduction × somme des intervalles sélectionnés
```

La médiane et l’histogramme sont recalculés sur les délais individuels modifiés. On ne soustrait pas un pourcentage de la médiane globale, ce qui serait généralement incorrect. Le scénario à 0 % est l’identité ; un état absent laisse le dossier inchangé. Les issues et les parcours restent fixes.

Une réduction n’est pas un gain réalisé. La démo ne vérifie pas la faisabilité opérationnelle de l’hypothèse et ne produit aucune recommandation de décision de crédit.

## Source

van Dongen, Boudewijn (2017): *BPI Challenge 2017*. Version 1. 4TU.ResearchData. https://doi.org/10.4121/uuid:5f3067df-f10b-45da-b98b-86ae4c7a310b.
