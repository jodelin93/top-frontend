---
id: discounts-admin
title: Créer une remise ou un code promo
category: Catalogue
order: 809
routes: [/admin/discounts]
keywords: [remise, code promo, coupon, promotion, pourcentage, montant fixe, achetez X obtenez Y, limite d'utilisation, validité]
related: [pos-discounts, price-lists]
---
La page **Remises** regroupe les promotions et les codes promo utilisables à la caisse : type, valeur, nombre d'utilisations et validité.

![La liste des remises](shot:admin-discounts)

1. Cliquez sur **Nouvelle remise**.
2. Saisissez le **Nom** et le **Code**. Le caissier tape ce code à la caisse ; il est enregistré en majuscules.
3. Choisissez le **Type** : **Pourcentage de remise**, **Montant fixe de remise** ou **Achetez X, obtenez Y gratuits**.
4. Choisissez **S'applique à** : **Panier entier**, **Produits spécifiques** ou **Catégories spécifiques**.
5. Saisissez la valeur : pourcentage, montant, ou **Quantité achetée** et **Quantité offerte**.
6. Au besoin, fixez un **Montant minimum d'achat**, une **Remise maximale** et une **Limite d'utilisation**.
7. Réglez la **Priorité** : les remises de priorité plus élevée s'appliquent en premier.
8. Indiquez les dates **Valide du** et **Valable jusqu'au**.
9. Cliquez sur **Créer la remise**.

> **Attention :** la date de fin doit être après la date de début et ne peut pas être dans le passé. Une remise dont la date de fin est passée n'est plus acceptée à la caisse, même si son statut est encore **Actif**.

> **Astuce :** les remises manuelles données par le caissier (sans code) sont limitées par les paramètres du magasin ; au-delà, un gérant doit approuver.
