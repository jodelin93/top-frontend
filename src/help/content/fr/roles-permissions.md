---
id: roles-permissions
title: Rôles et autorisations
category: Personnel
order: 1205
routes: [/admin/roles]
keywords: [rôle, autorisations, droits, permissions, nouveau rôle, rôle personnalisé, intégré, tout cocher]
related: [getting-started-roles, users-manage, approvals]
---
Un rôle est un ensemble de droits. Les quatre rôles intégrés (Propriétaire, Administration, Gérant, Caissier) portent la mention **Intégré** et ne peuvent pas être supprimés. La page demande le droit **Gérer les rôles et les autorisations**.

![La page Rôles et autorisations](shot:admin-roles)

## Voir et modifier les droits d'un rôle

1. Dans la liste de gauche, cliquez sur un rôle. Le nombre de personnes qui l'ont s'affiche sous son nom.
2. Les droits sont regroupés par thème : **Point de vente**, **Ventes**, **Espèces**, **Clients**, etc.
3. Cochez ou décochez les droits. **Tout cocher** et **Tout décocher** agissent sur un thème entier.
4. Cliquez sur **Enregistrer** (ou **Abandonner les modifications**).

Les changements s'appliquent au prochain chargement de page de chaque personne.

> **Attention :** vous ne pouvez pas modifier un rôle qui a des droits que vous n'avez pas, ni ajouter un droit que vous n'avez pas. Le rôle **Propriétaire** a toujours tous les droits.

## Créer un rôle personnalisé

1. Cliquez sur **Nouveau rôle**.
2. Tapez le **Nom** (la **Clé** se crée toute seule) et une **Description**.
3. Dans **Copier les autorisations de**, choisissez le rôle de départ, par exemple **Caissier**.
4. Cliquez sur **Créer le rôle**, cochez les droits à ajouter, puis **Enregistrer**.
5. Attribuez ce rôle aux personnes concernées dans **Utilisateurs**.

Pour supprimer un rôle personnalisé, ouvrez-le et cliquez sur **Supprimer**. La suppression est refusée tant qu'une personne a encore ce rôle.

> **Astuce :** les rôles **Accountant** (comptable) et **Inventory clerk** (magasinier) sont des exemples de rôles personnalisés : adaptez-les à votre magasin.
