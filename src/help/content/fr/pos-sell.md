---
id: pos-sell
title: Ajouter des produits et gérer le panier
category: Caisse
order: 204
routes: [/pos]
keywords: [vendre, produit, scanner, code-barres, recherche, panier, quantité, note, vider, rupture de stock, catégorie]
related: [pos-weighed-items, pos-customer, pos-discounts, pos-payment, faq-till]
---
Vous avez trois façons d'ajouter un produit :

- **Scanner le code-barres** : le produit s'ajoute tout seul au panier.
- **Chercher** : tapez une partie du nom, le SKU ou le code-barres dans **Rechercher des produits ou scanner un code-barres... (F2)**, puis cliquez sur la fiche.
- **Parcourir** : cliquez sur une catégorie (**Tout**, **Boissons**…) puis sur la fiche du produit.

Chaque fiche affiche le nom, la variante (taille, couleur), le SKU, le prix et le stock, par exemple **65 en stock**.

Cliquer de nouveau sur la même fiche (ou scanner de nouveau le produit) augmente la quantité de sa ligne : le produit n'apparaît qu'une fois dans le panier. La ligne garde sa remise ou son prix modifié. Seuls les produits vendus au poids ont une ligne par pesée.

![Le panier avec plusieurs articles](shot:pos-cart)

## Gérer le panier

Le panier, à droite, montre chaque ligne avec son prix unitaire, sa quantité et son total.

- Cliquez sur **+** ou **−** pour changer la quantité, ou tapez-la dans la case.
- Cliquez sur la corbeille pour retirer la ligne.
- Cliquez sur **Ajouter une note** pour écrire une remarque imprimée sur le ticket.
- Cliquez sur **Vider le panier** pour tout effacer (une confirmation est demandée).

Sous les lignes : le **Sous-total**, les remises, la **Taxe**, le **Total** et son équivalent dans l'autre devise (par exemple **≈ en HTG**).

> **Attention :** la caisse ne vend jamais plus que le stock disponible. Une fiche **Rupture de stock** est grisée. Si vous en demandez trop, un message indique la quantité disponible, par exemple « Seulement 3 × … en stock ».

> **Astuce :** si un code scanné est inconnu, le message « Aucun produit trouvé pour … » s'affiche. Vérifiez l'article ou cherchez-le par son nom.

> **Astuce :** au clavier, **↑ ↓** choisissent une ligne, **+** et **−** changent sa quantité et **Suppr** la retire.

Hors ligne, la recherche par nom, SKU ou code-barres fonctionne aussi : elle utilise la copie du catalogue gardée sur l'appareil (voir [Vendre hors ligne](topic:offline-mode)).
