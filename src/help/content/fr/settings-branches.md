---
id: settings-branches
title: Succursales, caisses et numérotation des ventes
category: Paramètres
order: 1305
routes: [/admin/settings?tab=branches, /admin/settings]
keywords: [succursale, caisse, registre, nouvelle caisse, tiroir-caisse, tiroir partagé, numérotation, préfixe, code de succursale, fuseau horaire]
related: [settings-warehouses, shifts-open, devices]
---
Une succursale est un magasin physique. Chaque caisse appartient à une succursale.

![L'onglet Succursales et caisses](shot:settings-branches)

## Créer une succursale

1. Dans l'onglet **Succursales et caisses**, cliquez sur **Nouvelle succursale**.
2. Remplissez le **Nom**, le **Code**, l'adresse, le **Fuseau horaire** (America/Port-au-Prince) et la **Devise**.
3. Cliquez sur **Créer la succursale**.

Le **Code** sert de préfixe aux numéros de vente : MAIN-000123, DT-000045… Chaque succursale a sa propre suite. Choisissez des lettres courtes et claires. Les ventes plus anciennes gardent leur numéro d'origine (par exemple S-000544).

## Créer une caisse

1. Sous **Caisses**, cliquez sur **Nouvelle caisse**.
2. Choisissez la **Succursale** et l'**Emplacement de stock** d'où la caisse retire les articles vendus.
3. Choisissez la **Règle des tiroirs** : **Un caissier par tiroir** ou **Tiroir partagé**.
4. Cliquez sur **Créer la caisse**.

Dans la fiche d'une caisse, la partie **Tiroirs-caisses** liste ses tiroirs : **Ajouter un tiroir**, **Activer** ou **Désactiver**.

> **Attention :** une caisse sans emplacement de stock ne peut pas vendre.
