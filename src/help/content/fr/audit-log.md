---
id: audit-log
title: Le journal d'audit
category: Matériel et système
order: 1403
routes: [/admin/audit]
keywords: [journal d'audit, audit, traçabilité, qui a fait, approuvé par, historique des actions, contrôle]
related: [approvals, system-events, settings-history]
---
Le journal d'audit garde la trace de chaque action sensible : qui l'a faite, qui l'a approuvée et ce qui a changé. Les entrées ne peuvent être ni modifiées ni supprimées.

![Le journal d'audit](shot:admin-audit)

1. Dans le menu, cliquez sur **Journal d'audit**.
2. Tapez une action dans **Filtrer par action, ex. sale.voided**.
3. Choisissez un **Type d'événement** si besoin.
4. Cliquez sur la flèche d'une ligne pour voir les détails (**Avant** / **Après**, adresse IP, montants, numéro de vente…).

Les colonnes **Qui**, **Approuvé par**, **Cible** et **Motif** répondent aux questions habituelles d'un contrôle.

> **Astuce :** actions utiles : sale.voided (vente annulée), user.password_reset (mot de passe réinitialisé), role.updated (rôle modifié), session.created (connexion), auth.login_failed (mot de passe erroné).

> **Attention :** le journal complet est réservé aux personnes qui ont accès à toutes les succursales.
