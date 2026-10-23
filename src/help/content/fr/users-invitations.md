---
id: users-invitations
title: Ajouter un utilisateur ou l'inviter
category: Personnel
order: 1203
routes: [/admin/users]
keywords: [utilisateur, ajouter un utilisateur, compte, accès, invitation, invité, succursales, rôle]
related: [users-manage, account-invitations, roles-permissions, employees]
---
La page **Utilisateurs** demande le droit **Gérer les comptes du personnel** (propriétaire et administrateur par défaut). La liste montre **Nom**, **E-mail**, **Rôle**, **Succursales**, **Statut**, **A2F** et **Dernière connexion** ; votre ligne porte **(vous)**.

![La liste des utilisateurs](shot:admin-users)

1. Cliquez sur **Ajouter un utilisateur**.
2. Tapez l'**E-mail**, puis le **Prénom** et le **Nom**.
3. Choisissez le **Rôle**, par exemple **Caissier**.
4. Sous **Accès aux succursales**, choisissez **Toutes les succursales** ou **Seulement certaines succursales** et cochez-les.
5. Cliquez sur **Ajouter un utilisateur**. Vous ne tapez pas de mot de passe : la personne choisit le sien.

![Le formulaire Ajouter un utilisateur](shot:user-form)

| Cas | Ce qui se passe |
| --- | --- |
| L'e-mail n'a pas encore de compte | La personne reçoit un e-mail **Choisir mon mot de passe** (lien valable 72 heures). En choisissant son mot de passe, elle confirme son adresse e-mail ; elle peut ensuite se connecter. D'ici là, son statut est « En attente du mot de passe (e-mail non confirmé) ». |
| L'e-mail a déjà un compte (dans un autre magasin) | La personne reçoit une **invitation** ; son statut est « Invité — en attente d'acceptation ». |

Une personne invitée n'a accès au magasin qu'après avoir accepté l'invitation, dans **Sécurité du compte** ou sur le tableau de bord (voir [Invitations et changement de magasin](topic:account-invitations)).

> **Attention :** personne ne peut donner plus de droits qu'il n'en a lui-même. Seul un propriétaire peut nommer un autre propriétaire.

> **Astuce :** l'e-mail n'est pas arrivé ? Vérifiez l'adresse et les courriers indésirables, puis cliquez sur l'icône d'envoi de sa ligne (**Renvoyer le lien pour choisir le mot de passe**). Un nouveau lien remplace l'ancien.
