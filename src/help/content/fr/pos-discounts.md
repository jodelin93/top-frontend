---
id: pos-discounts
title: Remises et codes promo à la caisse
category: Caisse
order: 207
routes: [/pos]
keywords: [remise, réduction, rabais, pourcentage, code promo, coupon, F8, motif, limite de remise, promotion]
related: [pos-group-pricing, approvals, discounts-admin, faq-till]
---
## Remise sur une ligne

1. Sur la ligne du produit, tapez le pourcentage dans la case **%**.
2. La remise s'affiche en vert sous le total de la ligne.
3. Si la remise dépasse la limite du magasin, remplissez le champ **Motif de la remise (obligatoire)**.

> **Attention :** au-delà de la limite, le caissier voit **Nécessite l'approbation d'un gérant à l'encaissement**. Un responsable devra approuver au moment d'encaisser (voir [Faire approuver par un responsable](topic:approvals)).

## Remise sur tout le panier ou code promo

1. Cliquez sur **Remise** (touche **F8**).
2. Pour un code promo, tapez-le dans **Code de remise** et cliquez sur **Appliquer**. Le code accepté s'affiche avec sa description.
3. Pour une remise libre, allez dans **Remise manuelle sur la vente**. Choisissez **%** ou **Montant**, tapez la valeur et cliquez sur **Appliquer**.
4. Au-delà de la limite du magasin, remplissez le motif demandé.
5. Fermez la fenêtre. Le bouton affiche la remise active, par exemple **WELCOME10**.

![La fenêtre Remises](shot:pos-discount-dialog)

> **Astuce :** cliquez sur **Retirer** pour enlever un code. Les codes promo demandent une connexion.

> **Attention :** un code dont la date de fin est passée est refusé, même si son statut est encore **Actif**.

Les remises automatiques (promotions actives, remise du groupe du client) s'appliquent sans rien faire ; elles apparaissent dans les totaux et sur le reçu.
