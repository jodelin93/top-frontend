---
id: inventory-transfers
title: Transférer du stock entre emplacements
category: Stock
order: 904
routes: [/admin/inventory?tab=transfers, /admin/inventory]
keywords: [transfert, transférer, déplacer, expédier, réceptionner, en transit, manquant, entrepôt, succursale, approbation]
related: [inventory-stock, settings-warehouses, approvals]
---
Un transfert déplace du stock d'un emplacement à un autre (de l'entrepôt vers une succursale, par exemple). Il passe par trois étapes : brouillon, expédition, réception.

![L'onglet Transferts](shot:inventory-transfers)

## Créer le transfert

1. Cliquez sur l'onglet **Transferts**, puis sur **Nouveau transfert**.
2. Choisissez l'emplacement **Origine** et l'emplacement **Destination**.
3. Ajoutez les produits et saisissez la **Quantité** de chacun, avec des **Notes** si besoin.
4. Cliquez sur **Enregistrer le brouillon**.

> **Astuce :** un brouillon ne bouge pas le stock. Vous pouvez encore le **Modifier** ou l'annuler (**Annuler le transfert**).

## Expédier

1. Cliquez sur la ligne du transfert pour l'ouvrir.
2. Si le bouton **Soumettre pour approbation** apparaît, cliquez dessus et attendez qu'un responsable clique sur **Approuver**.
3. Cliquez sur **Expédier...**, saisissez dans **Maintenant** les unités qui partent.
4. Cochez **C'est la dernière expédition** si le reste ne sera jamais envoyé.
5. Cliquez sur **Expédier**. Les unités quittent l'origine et passent **En transit**.

## Réceptionner à destination

1. À l'arrivée, ouvrez le transfert et cliquez sur **Réceptionner...**.
2. Saisissez les quantités arrivées en **Bon état**, **Endommagé** et **Manquant**.
3. Cliquez sur **Réceptionner**. Le transfert passe au statut **Reçu** ; son **Historique** garde chaque étape.

> **Attention :** les unités manquantes restent en transit jusqu'à ce qu'on les retrouve. Si elles sont perdues, cliquez sur **Passer les manquants en perte** et indiquez la raison.

> **Attention :** dans **Paramètres des transferts**, le gérant choisit quand un transfert doit être approuvé avant l'expédition : **Jamais**, **Au-delà d'un montant** ou **Toujours**. La personne qui a demandé le transfert ne peut pas l'approuver elle-même. La **Tolérance de surplus reçu (%)** fixe combien d'unités en trop peuvent être reçues sans approbation.
