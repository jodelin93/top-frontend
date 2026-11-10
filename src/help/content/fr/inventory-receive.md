---
id: inventory-receive
title: Réceptionner du stock sans bon de commande
category: Stock
order: 902
routes: [/admin/inventory]
keywords: [réception, réceptionner, livraison, entrée de stock, bon état, endommagé, coût unitaire, sans commande]
related: [purchasing-receive, inventory-stock, inventory-valuation]
---
Utilisez cette fonction pour une livraison sans bon de commande. Pour une commande fournisseur, passez par [Réceptionner une livraison](topic:purchasing-receive).

1. Dans l'onglet **Stock**, cliquez sur **Réceptionner du stock**.
2. Choisissez l'**Emplacement** qui reçoit la marchandise.
3. Saisissez la **Référence fournisseur** (facture ou bon de livraison) et, si besoin, des **Notes**.
4. Cherchez chaque produit dans **Produits** et cliquez sur **Ajouter**.
5. Saisissez la quantité en **Bon état**, la quantité **Endommagé** et le **Coût unitaire**.
6. Cliquez sur **Réceptionner du stock**.

![La fenêtre Réceptionner du stock](shot:inventory-receive)

> **Astuce :** le coût unitaire saisi met à jour le coût du produit (coût moyen pondéré ou PEPS, selon la méthode du magasin). Les unités endommagées restent à l'emplacement choisi, sauf si **Garder les marchandises endommagées à part** est coché dans **Paramètres › Général** (bloc **Stock et achats**) : elles vont alors dans l'emplacement de quarantaine ou des articles endommagés de l'entrepôt (un emplacement non vendable **Damaged** est créé s'il n'en a pas), comme les retours rapportés endommagés.
