---
id: products-create
title: Créer ou modifier un produit
category: Catalogue
order: 802
routes: [/admin/products]
keywords: [nouveau produit, créer un produit, SKU, prix de vente, coût, catégorie de taxe, stock minimum, image, photo, type de produit, simple, variable, composé, numéro de série]
related: [products-list, products-variants, categories, tax-categories]
---
1. Sur la page **Produits**, cliquez sur **Nouveau produit**.
2. Remplissez **Nom** et **SKU** (votre code interne, unique).
3. Ajoutez si besoin une **Description** et un **Code-barres** (celui imprimé sur l'emballage).
4. Choisissez le **Type** (voir le tableau).
5. Saisissez le **Prix de vente** et le **Coût unitaire** (prix d'achat, utile pour les marges).
6. Choisissez la **Catégorie** et la **Catégorie de taxe**. Laissez **Taux de taxe par défaut du magasin** si le produit suit le taux normal.
7. Complétez au besoin **Marque**, **Fabricant**, **Unité de mesure** et **Mots-clés** (tapez un mot puis Entrée).
8. Dans **Assortiment par succursale**, cochez des succursales seulement si le produit n'est pas vendu partout.
9. Indiquez le **Stock minimum** et le **Seuil de réapprovisionnement** pour les alertes de stock bas.
10. Laissez **Suivre le stock** coché pour un article physique ; décochez-le pour un service. Cochez **Suivre les numéros de série** pour les appareils vendus avec un numéro.
11. Cliquez sur **Créer le produit**.

![Le formulaire Nouveau produit](shot:product-form)

| Type | Quand l'utiliser |
| --- | --- |
| **Simple** | Un seul article, un seul prix. Le prix se saisit dans la fiche. |
| **Variable (avec variantes)** | Même produit en plusieurs tailles ou couleurs : chaque variante a son SKU, son code-barres, son prix et son stock. |
| **Composé (lot)** | Un lot ou coffret vendu comme un seul article. |

> **Attention :** le type ne peut plus être changé après la création. Pour un produit variable ou composé, le prix se saisit dans les [variantes](topic:products-variants) après l'enregistrement.

> **Astuce :** si le chiffre de contrôle d'un code-barres EAN ou UPC est faux, l'application vous prévient.

## Modifier un produit et ajouter des images

1. Cliquez sur le crayon de la ligne du produit.
2. Modifiez les champs voulus. **Statut** passe le produit en **Actif**, **Inactif** ou **Abandonné**.
3. En bas, dans **Images**, cliquez sur **Ajouter des images** : JPEG, PNG ou WebP de 5 Mo maximum, 10 images par produit.
4. Cliquez sur l'étoile d'une image pour en faire l'image principale (listes et caisse).
5. Cliquez sur **Enregistrer les modifications**.

> **Astuce :** les images s'ajoutent seulement après la création : créez d'abord le produit, puis rouvrez-le.
