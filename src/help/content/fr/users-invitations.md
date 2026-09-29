---
id: users-invitations
title: Ajouter un utilisateur ou l'inviter
category: Personnel
order: 1203
routes: [/admin/users]
keywords: [utilisateur, ajouter un utilisateur, compte, accès, invitation, invité, mot de passe de départ, succursales, rôle]
related: [users-manage, account-invitations, roles-permissions, employees]
---
La page **Utilisateurs** demande le droit **Gérer les comptes du personnel** (propriétaire et administrateur par défaut). La liste montre **Nom**, **E-mail**, **Rôle**, **Succursales**, **Statut**, **A2F** et **Dernière connexion** ; votre ligne porte **(vous)**.

![La liste des utilisateurs](shot:admin-users)

1. Cliquez sur **Ajouter un utilisateur**.
2. Tapez l'**E-mail**, puis le **Prénom** et le **Nom**.
3. Choisissez le **Rôle**, par exemple **Caissier**.
4. Sous **Accès aux succursales**, choisissez **Toutes les succursales** ou **Seulement certaines succursales** et cochez-les.
5. Tapez un **Mot de passe** de départ.
6. Cliquez sur **Ajouter un utilisateur**.

![Le formulaire Ajouter un utilisateur](shot:user-form)

| Cas | Ce qui se passe |
| --- | --- |
| L'e-mail n'a pas encore de compte | Le compte est créé avec le mot de passe saisi. La personne peut se connecter tout de suite. |
| L'e-mail a déjà un compte (dans un autre magasin) | Le mot de passe saisi n'est pas utilisé. La personne reçoit une **invitation** ; son statut est « Invité — en attente d'acceptation ». |

Une personne invitée n'a accès au magasin qu'après avoir accepté l'invitation, dans **Sécurité du compte** ou sur le tableau de bord (voir [Invitations et changement de magasin](topic:account-invitations)).

> **Attention :** personne ne peut donner plus de droits qu'il n'en a lui-même. Seul un propriétaire peut nommer un autre propriétaire.

> **Astuce :** communiquez le mot de passe de départ de vive voix et demandez à la personne de le changer à sa première connexion ([Sécurité du compte](topic:account-security)).
