---
id: shifts-close
title: Clôturer la session, compter le tiroir et imprimer le rapport Z
category: Sessions de caisse
order: 303
routes: [/pos]
keywords: [clôturer, clôture, fin de journée, comptage, comptage à l'aveugle, écart, tolérance, rapport Z, passer la caisse, recompter]
related: [shifts-open, shifts-admin, approvals, shifts-cash-movements]
---
En fin de service, comptez le tiroir et clôturez la session.

1. Cliquez sur le bouton de session dans la barre du haut.
2. Cliquez sur **Clôturer la session**.
3. Laissez cochée la case **Comptage à l'aveugle** : vous comptez sans voir le montant attendu, ce qui rend le comptage plus honnête.
4. Cliquez sur **Commencer le comptage**.

> **Attention :** dès que le comptage commence, la caisse ne vend plus : la session passe à **Comptage en cours**. Pour vendre à nouveau, cliquez sur **Reprendre les ventes**. Pour revenir au comptage plus tard : **Poursuivre la clôture**.

## Compter

1. Tapez le nombre de chaque billet et pièce en dollars.
2. Dans **Espèces en HTG dans le tiroir**, tapez le total des gourdes présentes (laissez vide s'il n'y en a pas).
3. Cliquez sur **Vérifier le comptage**.

L'application affiche, pour chaque devise, **Compté**, **Attendu** et **Écart** :

- écart nul ou dans la tolérance : message vert, par exemple « Dans la tolérance de 5,00 $US » ;
- écart au-delà de la tolérance : message rouge ; un **Motif de l'écart** est obligatoire et le caissier doit obtenir l'approbation d'un gérant.

## Terminer

1. Si un motif est demandé, remplissez **Motif de l'écart**.
2. Si le prochain caissier reprend ce tiroir, choisissez son nom dans **Passer la caisse à (facultatif)** : sa session s'ouvrira avec les espèces comptées. Sinon, laissez **Personne : clôturer seulement**.
3. Ajoutez des **Notes (facultatif)** si besoin. En cas de doute, cliquez sur **Recompter**.
4. Cliquez sur **Clôturer la session** (ou **Clôturer et passer la caisse**).

Quand l'écart dépasse la tolérance, la fenêtre **Approbation du gérant requise** s'ouvre : le gérant vérifie le tiroir, saisit ses identifiants et clique sur **Approuver**. Son nom figure sur le rapport Z (**Approuvé par**).

## Le rapport Z

La fenêtre **Session clôturée** affiche le **RAPPORT Z** : heures, caissier et gérant, ventes par mode de paiement, ventes annulées, calcul du tiroir en USD et HTG, mouvements d'espèces, comptage, écart, tolérance et motif.

1. Cliquez sur **Imprimer le rapport Z**.
2. Cliquez sur **Terminé**.

> **Astuce :** une réimpression du rapport Z porte la mention COPIE. Les rapports des sessions passées se retrouvent dans [Suivre les sessions](topic:shifts-admin). La tolérance d'écart se règle dans les paramètres du magasin.
