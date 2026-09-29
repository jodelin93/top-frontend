---
id: returns-pos
title: Faire un retour et rembourser le client
category: Retours et annulations
order: 401
routes: [/pos, /admin/returns]
keywords: [retour, rembourser, remboursement, avoir, note de crédit, reçu, remettre en stock, endommagé, quarantaine, rebut, délai de retour]
related: [returns-exchange, returns-goodwill, returns-admin, sales-void]
---
Un **retour** reprend des articles vendus, même des jours plus tard. Il crée un **avoir** (note de crédit) ; la vente d'origine reste dans l'historique, marquée remboursée. Pour une vente saisie par erreur pendant la même session, préférez l'[annulation](topic:sales-void).

> **Attention :** les retours sont réservés aux personnes autorisées à rembourser (gérant, administrateur, propriétaire par défaut). Le caissier ne voit pas le bouton **Retours** : il appelle le gérant. Hors ligne, le bouton est grisé.

## Retrouver la vente et choisir les articles

1. Cliquez sur **Retours** dans la barre du haut (sur téléphone : **⋯** puis **Retours**).
2. Dans **Nouveau retour**, scannez le code-barres du reçu ou tapez son numéro, par exemple MAIN-000001.
3. Cliquez sur **Rechercher la vente**. La vente s'affiche avec son client et ses paiements.
4. Laissez l'onglet **Retour** actif.
5. Pour chaque article rapporté, tapez la quantité dans **À RETOURNER** (0 pour les autres : c'est un retour partiel).
6. Dans **ÉTAT**, choisissez : **Remettre en stock**, **Endommagé — garder en quarantaine** ou **Endommagé — mettre au rebut**.
7. Remplissez le **Motif du retour**.

![La fenêtre Nouveau retour](shot:returns-new)

La colonne **REMBOURSEMENT** calcule le montant par ligne, remises et taxes d'origine comprises.

## Choisir le remboursement

| Choix dans « Rembourser sur » | Effet | Approbation |
| --- | --- | --- |
| **Paiement d'origine (carte d'abord, puis espèces)** | Rembourse sur les moyens de la vente. | Aucune. |
| **Avoir du client** | Crée un avoir utilisable sur un prochain achat. | Aucune. Demande un client sur la vente. |
| **Cash**, **Card**, **MonCash**… | Rembourse sur un autre moyen. | Peut demander un gérant. |

1. Choisissez **Rembourser sur**, puis la **Caisse** d'où sortent les espèces.
2. Vérifiez le résumé, par exemple « 2 article(s) · remboursement d'environ 2,48 $US ».
3. Cliquez sur **Rembourser …**.

> **Attention :** les remboursements en espèces sont pris sur la session ouverte de la caisse choisie et apparaîtront au comptage. Au-delà du délai de retour (30 jours par exemple), l'approbation d'un gérant est nécessaire. Les articles reviennent dans un emplacement de votre succursale.

## Remettre l'avoir

La fenêtre **Retour effectué** affiche le document **AVOIR**, avec son propre numéro (par exemple MAIN-R-000001) et la facture d'origine. Cliquez sur **Imprimer l'avoir**, faites signer le client si besoin, rendez l'argent, puis cliquez sur **Terminé**.
