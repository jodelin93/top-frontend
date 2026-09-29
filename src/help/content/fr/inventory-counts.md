---
id: inventory-counts
title: Faire un inventaire (comptage)
category: Stock
order: 905
routes: [/admin/inventory?tab=counts, /admin/inventory]
keywords: [inventaire, comptage, compter, comptage à l'aveugle, écart, approuver, recompter, inventaire tournant]
related: [inventory-adjust, inventory-stock, approvals]
---
Un comptage compare le stock réel au stock enregistré, pour tout un emplacement ou une seule catégorie.

![L'onglet Comptages](shot:inventory-counts)

## Commencer

1. Cliquez sur l'onglet **Comptages**, puis sur **Nouveau comptage**.
2. Choisissez l'**Emplacement** et une **Catégorie** (ou **Tous les produits**).
3. Laissez coché **Comptage à l'aveugle** : les compteurs ne voient pas les quantités attendues.
4. Ajoutez des **Notes** et cliquez sur **Commencer le comptage**.

> **Astuce :** les quantités attendues sont figées au démarrage. Vous pouvez continuer à vendre pendant le comptage : ces ventes ne comptent pas comme des écarts.

## Saisir et soumettre

1. Ouvrez le comptage (statut **Comptage en cours**).
2. Saisissez la quantité dans **Compté** et, en cas d'écart, un **Motif**. Laissez vide une ligne non comptée : elle ne sera pas ajustée.
3. Cliquez sur **Enregistrer les comptages** pour continuer plus tard, ou sur **Soumettre le comptage**.

L'application affiche les écarts, les unités en plus ou en moins et la valeur nette.

> **Attention :** si tous les écarts restent dans la tolérance du magasin, le comptage est validé tout de suite. Sinon il passe **À approuver** : une personne autre que le compteur, avec la permission **Approuver les écarts d'inventaire**, doit le valider.

## Approuver (gérant)

1. Ouvrez le comptage **À approuver** et vérifiez chaque écart et son motif.
2. Cliquez sur **Approuver et valider** pour corriger le stock, ou sur **Renvoyer** pour faire recompter.

**Annuler le comptage** l'arrête sans rien modifier.
