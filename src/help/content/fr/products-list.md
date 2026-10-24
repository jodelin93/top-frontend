---
id: products-list
title: La liste des produits et les étiquettes
category: Catalogue
order: 801
routes: [/admin/products]
keywords: [produits, catalogue, liste, rechercher, filtrer, exporter, CSV, Excel, abandonner, étiquettes, imprimer des étiquettes]
related: [products-create, products-variants, products-import]
---
La page **Produits** (menu **Catalogue**) affiche tout votre catalogue : SKU, code-barres, catégorie, taxe, prix, stock, type et statut. Elle demande le droit de gérer les produits (propriétaire, administrateur, gérant, magasinier).

![La liste des produits](shot:admin-products)

> **Note :** une personne limitée à certaines succursales (par exemple un caissier d'une seule boutique) ne voit que les produits vendus dans ses succursales, et les produits vendus partout. Le propriétaire, l'administrateur et un gérant de toute l'entreprise (toutes les succursales) voient tout le catalogue. Les succursales d'un produit se choisissent dans sa fiche, dans la partie des succursales (aucune cochée : vendu partout).

1. Tapez un nom, un SKU ou un code-barres dans **Rechercher par nom, SKU ou code-barres...**.
2. Si besoin, filtrez par **Catégorie** (une catégorie inclut ses sous-catégories), **Type**, statut (**Actif**, **Inactif**, **Abandonné**), **Étiquettes** ou **Succursale**.
3. Choisissez l'ordre dans **Trier par** : **Plus récents d'abord** ou **Plus anciens d'abord** (date de création), nom, prix, stock, catégorie, SKU ou **Modifiés récemment**. Le choix est gardé sur cet ordinateur.
4. Pour exporter le catalogue, cliquez sur **Exporter en CSV** ou **Exporter en Excel**.

Un produit vendu sans stock (un service, par exemple) affiche **—** dans la colonne Stock et n'apparaît pas dans l'**Inventaire**.

Chaque ligne a des icônes à droite :

- le crayon (**Modifier**) ouvre la fiche du produit ;
- les calques (**Variantes**) apparaissent pour les produits à variantes ;
- la corbeille rouge (**Abandonner**) retire le produit de la vente.

> **Attention :** un produit n'est jamais supprimé. **Abandonner** le passe au statut **Abandonné** : il n'est plus vendu, mais son historique de ventes et de stock est conservé.

En haut de la page, d'autres boutons ouvrent : **Unités** ([produits au poids](topic:products-units-weight)), **Attributs** ([variantes](topic:products-variants)) et **Imprimer des étiquettes**.

## Imprimer des étiquettes de prix

1. Cliquez sur **Imprimer des étiquettes**.
2. Cliquez sur **Ajouter** à côté de chaque produit voulu, puis indiquez le nombre d'étiquettes.
3. Choisissez la **Langue des étiquettes**, puis cliquez sur **Préparer … étiquettes** : les étiquettes s'affichent comme elles seront imprimées.
4. Cliquez sur **Imprimer**.

Les étiquettes font **1 × 1 pouce**. Chacune affiche le nom, le prix et le code-barres du code du produit (le SKU quand le produit n'a pas de code-barres).

- **Avec une imprimante d'étiquettes configurée dans JodaPrint**, les étiquettes partent directement dessus, sans la fenêtre d'impression du navigateur. Le message **… étiquettes envoyées à l'imprimante d'étiquettes** le confirme. Voir [Matériel](topic:hardware).
- **Sans elle**, la fenêtre d'impression du navigateur s'ouvre : choisissez-y l'imprimante d'étiquettes et un papier de 1 × 1 pouce.

> **Astuce :** un code fait seulement de chiffres s'imprime avec des barres plus épaisses, que les lecteurs lisent plus facilement. Un code très long ne tient pas sur l'étiquette : il est écrit sans code-barres.

> **Astuce :** sur téléphone, les produits s'affichent en cartes, avec les mêmes boutons.
