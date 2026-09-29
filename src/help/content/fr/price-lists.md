---
id: price-lists
title: Les listes de prix
category: Catalogue
order: 807
routes: [/admin/price-lists]
keywords: [liste de prix, tarif, prix promotionnel, prix de gros, membre, priorité, validité, quantité minimum]
related: [customers-groups, pos-group-pricing, tax-categories, discounts-admin]
---
Une liste de prix remplace le prix de base de certains produits. La page **Listes de prix et taxes** les regroupe.

![La page Listes de prix et taxes](shot:admin-price-lists)

| Type | Application |
| --- | --- |
| **Standard** | Appliquée automatiquement à la caisse quand elle est active. |
| **Promotionnelle** | Appliquée automatiquement, en général pour une durée limitée (soldes). |
| **Gros** | Pour les clients d'un groupe qui l'a comme liste par défaut. |
| **Membre** | Pour les clients d'un groupe qui l'a comme liste par défaut. |

## Créer une liste

1. Cliquez sur **Nouvelle liste de prix**.
2. Saisissez le **Nom** et le **Code**.
3. Choisissez le **Type**, la **Devise** et la **Succursale** (ou **Toutes les succursales**).
4. Réglez la **Priorité** : la plus élevée l'emporte si plusieurs listes s'appliquent.
5. Indiquez **Valide du** et **Valide au** (laissez vide pour commencer tout de suite ou sans fin).
6. Cliquez sur **Créer la liste de prix**.

> **Attention :** la date de fin doit être après la date de début (« Doit être après la date de début ») et ne peut pas être dans le passé (« La date de fin ne peut pas être dans le passé »).

## Saisir les prix

1. Cliquez sur la ligne de la liste dans le tableau.
2. Cliquez sur **Ajouter des produits** et choisissez les produits ou variantes.
3. Saisissez le **Prix de la liste**. Indiquez une **Qté min.** si le prix ne vaut qu'à partir d'une quantité.
4. Cliquez sur **Enregistrer les prix**.

> **Astuce :** les produits absents d'une liste gardent leur prix de base. Choisissez une liste comme **Liste de prix par défaut** d'un [groupe de clients](topic:customers-groups) : la caisse l'applique automatiquement dès qu'un client du groupe est choisi. Les prix à partir d'une quantité minimum ne sont pas encore appliqués en caisse.
