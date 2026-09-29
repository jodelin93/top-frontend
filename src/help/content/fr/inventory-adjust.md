---
id: inventory-adjust
title: Corriger le stock, voir les mouvements et vérifier le stock
category: Stock
order: 903
routes: [/admin/inventory, /admin/inventory?tab=movements]
keywords: [ajustement, corriger, casse, vol, perte, expiré, mouvements, historique, vérifier le stock, reconstruire, stock négatif]
related: [inventory-counts, inventory-stock, review-queue]
---
## Corriger le stock (ajustement)

Un ajustement corrige le stock après une casse, un vol, une date dépassée ou une erreur de comptage.

1. Dans l'onglet **Stock**, cliquez sur **Compter / ajuster**.
2. Choisissez l'**Emplacement** et le **Motif** : **Comptage de stock (recomptage)**, **Endommagé**, **Vol / perte**, **Expiré** ou **Autre**.
3. Choisissez le **Mode** : **Définir la quantité comptée** (l'écart est calculé) ou **Ajouter / retirer une quantité** (+5 pour ajouter, -2 pour retirer).
4. Expliquez la raison dans **Notes**.
5. Ajoutez les produits, saisissez les quantités, puis cliquez sur **Enregistrer l'ajustement**.

![La fenêtre Compter / ajuster](shot:inventory-adjust)

> **Attention :** le stock ne peut jamais devenir négatif. Si vous retirez plus que le stock, l'ajustement est refusé et la quantité disponible est indiquée. Cette règle vaut aussi pour les ventes, les transferts et l'import.

> **Astuce :** les ajustements demandent la permission **Ajuster le stock**. Chacun reçoit un numéro (ADJ-…) visible dans l'onglet **Mouvements**.

## Consulter les mouvements

L'onglet **Mouvements** montre les 200 derniers mouvements : ventes, retours, réceptions, transferts, ajustements et comptages. Filtrez par emplacement ; chaque ligne indique le **Type**, la **Quantité** (+ entrée, − sortie), la **Référence** et les **Notes**. Cet historique fait foi.

## Vérifier et reconstruire le stock

1. Dans **Mouvements**, cliquez sur **Vérifier le stock**.
2. Choisissez le **Périmètre** : **Tout le magasin** ou un emplacement.
3. Cliquez sur **Vérifier (simulation)** : rien n'est modifié.
4. Si tout va bien : **Tout correspond à l'historique. Rien à corriger.**
5. Sinon, vérifiez les écarts, puis cliquez sur **Appliquer les corrections**.

> **Attention :** **Appliquer les corrections** remplace les quantités enregistrées par celles de l'historique. Réservez cette action au gérant ou à l'administrateur.
