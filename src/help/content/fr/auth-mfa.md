---
id: auth-mfa
title: Saisir le code de double authentification
category: Premiers pas
order: 102
public: true
routes: [/auth/mfa-verify]
keywords: [double authentification, 2FA, A2F, code, vérification, authenticator, téléphone, 6 chiffres]
related: [account-2fa, auth-login, faq-account]
---
La double authentification protège un compte avec un code à 6 chiffres. Ce code change toutes les 30 secondes dans une application du téléphone (Google Authenticator, Microsoft Authenticator, 1Password…).

Si elle est activée sur votre compte, l'écran **Authentification à deux facteurs** apparaît après le mot de passe :

1. Ouvrez l'application d'authentification sur votre téléphone.
2. Lisez le code à 6 chiffres affiché pour votre compte.
3. Saisissez-le dans le champ **Code de vérification**.
4. Cliquez sur **Vérifier**.
5. En cas de problème, cliquez sur **Retour à la connexion** pour recommencer.

> **Astuce :** si le message **Code de vérification invalide** s'affiche, vérifiez que l'heure du téléphone est juste : un téléphone en retard produit des codes faux. Un même code ne sert qu'une fois : attendez le suivant si vous venez de l'utiliser.

> **Attention :** les codes faux comptent comme des essais de connexion. Après 5 erreurs à la suite, le compte est verrouillé 15 minutes.

Le magasin peut exiger la double authentification pour les personnes qui gèrent les utilisateurs, les rôles, les paramètres ou le journal d'audit. Dans ce cas, l'application vous envoie sur **Sécurité du compte** pour l'activer avant toute autre action (voir [Activer la double authentification](topic:account-2fa)).
