---
id: inventory-stock
title: Consulter le stock et repérer le stock bas
category: Stock
order: 901
routes: [/admin/inventory, /admin/inventory?tab=stock]
keywords: [stock, inventaire, emplacement, disponible, réservé, en transit, stock bas, vendable, quarantaine, magasinier]
related: [inventory-receive, inventory-adjust, purchasing-reorder, notifications]
---
Toutes les tâches de stock se font dans **Administration** > **Inventaire**. Les onglets sont **Stock**, **Mouvements**, **Comptages**, **Transferts**, **Ancienneté** et **Valorisation**. Le magasinier, le gérant, l'administrateur et le propriétaire y ont accès ; un caissier consulte seulement le stock à la caisse.

L'onglet **Stock** affiche, pour chaque produit et chaque emplacement, les quantités **En stock**, **Réservé**, **Disponible** et **En transit**, avec les dates du **Dernier comptage** et de la **Dernière réception**.

![L'onglet Stock](shot:inventory-stock)

1. Tapez un nom, un SKU ou un code-barres dans la recherche.
2. Choisissez un emplacement dans **Tous les emplacements** pour voir un seul magasin ou entrepôt.
3. Cochez **Vendable uniquement** pour cacher les emplacements non vendables (quarantaine, endommagé).

> **Astuce :** seul le stock d'un emplacement vendable peut être vendu. Le stock en quarantaine ou endommagé est gardé à part et porte une étiquette jaune.

## Repérer le stock bas

Un produit est en stock bas quand sa quantité atteint ou passe sous son **Stock minimum** (fiche produit).

1. Cochez **Stock bas uniquement**. Les lignes concernées portent l'étiquette rouge **Bas**.
2. Commandez ces produits (voir [Réapprovisionnement](topic:purchasing-reorder)).

> **Astuce :** l'application vérifie le stock régulièrement et envoie une alerte dans la cloche pour chaque emplacement en stock bas. L'alerte disparaît quand le stock est reconstitué.
