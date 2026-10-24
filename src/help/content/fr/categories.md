---
id: categories
title: Organiser les catégories
category: Catalogue
order: 805
routes: [/admin/categories]
keywords: [succursale, boutique, magasin, catégorie, sous-catégorie, arborescence, rayon, famille, ordre d'affichage, catégorie parente]
related: [products-create, products-import]
---
Les catégories forment une arborescence : une catégorie principale (ex. Alimentation) peut contenir des sous-catégories (ex. Boissons). Elles organisent la caisse et les rapports.

![La page Catégories](shot:admin-categories)

1. Dans le menu, cliquez sur **Catégories**, puis sur **Nouvelle catégorie**.
2. Saisissez le **Nom** et le **Code** (le code sert dans les imports CSV).
3. Choisissez une **Catégorie parente**, ou **Aucune (premier niveau)** pour une catégorie principale.
4. Réglez l'**Ordre d'affichage** (0 apparaît en premier).
5. Laissez cochée **Active (affichée à la caisse et dans les fiches produit)**.
6. Cliquez sur **Créer la catégorie**.

> **Astuce :** pour modifier une catégorie, cliquez sur son crayon. Désactiver une catégorie la cache à la caisse sans toucher aux produits.

## Rattacher une catégorie à des succursales

Dans la fiche d'une catégorie (nouvelle ou existante, avec le crayon), la partie **Succursales** choisit où elle est affichée :

- **aucune cochée** : la catégorie est affichée dans toutes les succursales ;
- **certaines cochées** : seul le personnel de ces succursales la voit (caissiers, magasiniers d'une seule boutique), dans l'administration comme à la caisse. Le propriétaire, l'administrateur et un gérant de toute l'entreprise voient toutes les catégories.

La colonne **Succursales** de la liste montre le réglage de chaque catégorie. À la caisse, une catégorie qui n'a aucun produit vendu dans la succursale de la caisse n'est pas affichée.

> **Astuce :** une personne limitée à certaines succursales ne peut rattacher une catégorie qu'à ses propres succursales.
