---
id: products-import
title: Importer des produits (CSV)
category: Catalogue
order: 806
routes: [/admin/import]
keywords: [import, importer, CSV, fichier, tableur, modèle, mise à jour en masse, colonnes]
related: [products-list, categories]
---
L'import crée ou met à jour de nombreux produits à partir d'un fichier CSV. Vous voyez toujours les changements avant l'enregistrement. Il faut la permission **Importer des produits depuis un CSV**.

![La page Importer des produits](shot:admin-import)

1. Dans le menu, cliquez sur **Importer**.
2. Cliquez sur **Télécharger le modèle** pour obtenir un fichier avec les bonnes colonnes.
3. Remplissez le fichier dans un tableur, puis enregistrez-le en CSV UTF-8 (5 000 lignes et 2 Mo au maximum).
4. Choisissez ce que deviennent les **Produits existants (même SKU)** : **Mettre à jour leurs informations** ou **Les laisser inchangés**.
5. Cochez **Remplacer aussi leurs prix et coûts** seulement si le fichier contient les nouveaux prix.
6. Cliquez sur **Choisir un fichier** et sélectionnez votre CSV.
7. Vérifiez le résumé : **Nouveaux produits**, **Mises à jour**, **Aucun changement** et **Lignes en erreur**.
8. Corrigez les lignes en erreur si besoin, puis cliquez sur **Importer N produits**.

Colonnes principales :

- **sku** (obligatoire) : reconnaît les produits existants ;
- **name** : obligatoire pour un nouveau produit ;
- **category_code** et **tax_category_code** : codes existants ;
- **price** et **cost** : produits simples seulement, avec un point décimal (ex. 4.50) ;
- **product_type** : simple, variable ou composite ;
- **status** : active, inactive ou discontinued.

> **Astuce :** une cellule vide laisse la valeur existante inchangée.

> **Attention :** la colonne allow_backorder est ignorée : la vente sous zéro de stock n'est jamais autorisée.
