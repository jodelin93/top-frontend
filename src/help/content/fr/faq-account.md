---
id: faq-account
title: Compte verrouillé, mot de passe oublié, accès refusé
category: Questions fréquentes
order: 1603
public: true
routes: [/auth/login]
keywords: [verrouillé, bloqué, mot de passe oublié, trop de tentatives, ne peut pas se connecter, invité, suspendu, rôle, accès]
related: [auth-login, users-manage, account-invitations]
---
## Mon compte est verrouillé

Après 5 mots de passe (ou codes 2FA) faux à la suite, le compte est verrouillé 15 minutes. La page de connexion affiche : « Trop de tentatives échouées. Ce compte est verrouillé pendant quelques minutes. »

1. Attendez 15 minutes sans réessayer : chaque nouvel essai faux prolonge le verrouillage.
2. Vérifiez que la touche Majuscule (Caps Lock) n'est pas activée.
3. Réessayez avec le bon mot de passe.

> **Attention :** si votre compte se verrouille alors que vous n'avez pas essayé de vous connecter, quelqu'un a peut-être tenté d'y entrer. Prévenez le propriétaire et changez votre mot de passe.

## J'ai oublié mon mot de passe

Demandez au propriétaire ou à un administrateur : il clique sur l'icône de clé de votre ligne dans **Utilisateurs** et vous donne un nouveau mot de passe (voir [Réinitialiser le mot de passe](topic:users-manage)). Changez-le ensuite vous-même dans **Sécurité du compte**.

## Un nouvel employé ne peut pas se connecter

Vérifiez dans **Utilisateurs** :

- son **Statut** : **Suspendu** bloque l'accès ;
- la mention « Invité — en attente d'acceptation » : la personne avait déjà un compte, elle doit accepter l'invitation dans **Sécurité du compte** (voir [Invitations](topic:account-invitations)) ;
- son e-mail : une faute de frappe empêche la connexion.

## Le changement de rôle ne s'applique pas

Un changement de rôle ou de droits s'applique au prochain chargement de page. La personne est aussi déconnectée quand son rôle change : elle doit simplement se reconnecter.

## Il me manque une page ou un bouton

Votre rôle ne donne pas accès à cette page ou cette action. Demandez à l'administrateur de vérifier vos autorisations (voir [Comprendre les rôles](topic:getting-started-roles)).
