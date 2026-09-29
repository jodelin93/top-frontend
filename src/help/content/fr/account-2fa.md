---
id: account-2fa
title: Activer la double authentification (2FA)
category: Mon compte
order: 1502
routes: [/account/security]
keywords: [double authentification, 2FA, A2F, QR code, authenticator, code à 6 chiffres, activer, désactiver, changer de téléphone]
related: [auth-mfa, settings-security, account-security]
---
La double authentification ajoute un code à 6 chiffres, affiché par une application sur votre téléphone. Même si quelqu'un vole votre mot de passe, il ne peut pas se connecter sans votre téléphone.

Installez d'abord une application d'authentification : Google Authenticator, Microsoft Authenticator ou 1Password par exemple.

1. Dans **Sécurité du compte**, zone **Authentification à deux facteurs**, cliquez sur **Activer**.
2. Ouvrez l'application sur votre téléphone et scannez le code QR affiché.
3. Si vous ne pouvez pas scanner, tapez dans l'application la clé affichée sous **Impossible de scanner ? Saisissez cette clé manuellement**.
4. Tapez le code à 6 chiffres que l'application affiche.
5. Cliquez sur **Vérifier et activer**.

Le **Statut** passe à **Activée**. À chaque connexion, le code vous sera demandé après le mot de passe (voir [Saisir le code](topic:auth-mfa)).

> **Attention :** ne montrez jamais le code QR ni la clé à une autre personne, et ne les prenez pas en photo.

> **Astuce :** pour abandonner avant la fin, cliquez sur **Annuler** : rien n'est activé avant **Vérifier et activer**.

Pour désactiver, cliquez sur **Désactiver** et tapez un code actuel de l'application. Pour changer de téléphone, désactivez-la avec l'ancien téléphone, puis activez-la avec le nouveau.

> **Attention :** si le magasin impose la double authentification aux administrateurs (voir [Hors ligne et sécurité](topic:settings-security)), les personnes concernées arrivent sur cette page à la connexion, avec le message **L'authentification à deux facteurs est obligatoire**, et doivent l'activer avant toute autre action.
