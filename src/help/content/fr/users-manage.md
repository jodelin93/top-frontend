---
id: users-manage
title: Modifier, suspendre un utilisateur ou réinitialiser son mot de passe
category: Personnel
order: 1204
routes: [/admin/users]
keywords: [réinitialiser l'A2F, deux facteurs, compte bloqué, téléphone perdu, déconnecter, connecté sur un autre appareil, un seul appareil, session, modifier un utilisateur, suspendre, suspendu, rôle, succursales, réinitialiser le mot de passe, mot de passe oublié, déconnecter]
related: [users-invitations, roles-permissions, faq-account]
---
## Limiter l'accès à certaines succursales

Un utilisateur limité ne voit que les ventes, sessions, stock et rapports de ses succursales ; les clients et le catalogue restent communs.

1. Cliquez sur le crayon de la ligne de la personne.
2. Sous **Accès aux succursales**, choisissez **Seulement certaines succursales** et cochez au moins une succursale.
3. Cliquez sur **Enregistrer les modifications**.

> **Astuce :** si la personne a une fiche employé, **Utiliser les succursales de l'employé** reprend les succursales de sa fiche. Un propriétaire a toujours accès à tout.

## Changer le rôle ou suspendre

1. Cliquez sur le crayon de la ligne.
2. Changez le **Rôle**, ou choisissez **Suspendu (aucun accès)** dans **Statut**.
3. Cliquez sur **Enregistrer les modifications**.

Dès l'enregistrement, la personne est déconnectée de tous ses appareils dans ce magasin : le changement s'applique tout de suite. Pour rendre l'accès, remettez le **Statut** sur **Actif**.

> **Attention :** vous ne pouvez pas changer votre propre rôle ni votre propre statut.

## Déconnecter un utilisateur

Un compte ne peut être connecté que sur un seul appareil à la fois. Si quelqu'un a laissé sa session ouverte sur un autre appareil (navigateur fermé sans se déconnecter, téléphone perdu), déconnectez-le :

1. Cliquez sur l'icône **Déconnecter** (une flèche qui sort d'une porte) sur sa ligne.
2. Confirmez. Il est déconnecté de tous les appareils et peut se reconnecter là où il est.

Le travail pas encore enregistré sur l'autre appareil est perdu. Vous ne pouvez pas vous déconnecter vous-même ici : utilisez **Se déconnecter**.

## Réinitialiser le mot de passe d'un membre

Tant qu'une personne n'a pas choisi son mot de passe (statut « En attente du mot de passe »), vous ne pouvez pas le faire à sa place : renvoyez-lui le lien avec l'icône d'envoi de sa ligne. C'est ainsi que chaque adresse e-mail est confirmée.

1. Cliquez sur l'icône de clé de la ligne.
2. Tapez le **Nouveau mot de passe**, puis retapez-le dans **Confirmer le mot de passe**.
3. Cliquez sur **Réinitialiser le mot de passe** et communiquez-le de façon sûre.

La personne est aussitôt déconnectée partout et se reconnecte avec le nouveau mot de passe.

> **Attention :** vous ne pouvez pas réinitialiser votre propre mot de passe ici : changez-le dans [Sécurité du compte](topic:account-security). Si le compte est aussi utilisé dans un autre magasin, la réinitialisation est refusée : la personne doit changer son mot de passe elle-même.

Pour couper l'accès d'une personne partout (téléphone perdu…), suspendez-la ou réinitialisez son mot de passe : toutes ses sessions dans le magasin sont fermées.

## Réinitialiser l'authentification à deux facteurs

Si une personne a perdu son téléphone, ou si ses codes à 6 chiffres sont refusés (son compte se bloque après plusieurs essais), le **propriétaire** clique sur l'icône **bouclier barré** de sa ligne (**Réinitialiser l'authentification à deux facteurs**) et confirme.

- Son authentification à deux facteurs est désactivée et son compte **débloqué** ; elle est déconnectée partout.
- Elle se connecte avec son mot de passe. Si son rôle l'exige, la caisse lui demande de reconfigurer l'authentification à deux facteurs avec un nouveau code QR.
- L'action est notée dans le [Journal d'audit](topic:audit-log).

> **Attention :** seul un propriétaire peut le faire, et pas pour son propre compte (voir [Authentification à deux facteurs](topic:account-2fa)). Un compte utilisé dans un autre magasin doit la désactiver lui-même.
