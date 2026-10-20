---
id: auth-forgot-password
title: Mot de passe oublié
category: Premiers pas
order: 109
public: true
routes: [/auth/forgot-password, /auth/reset-password]
keywords: [mot de passe oublié, réinitialiser le mot de passe, nouveau mot de passe, lien de réinitialisation, lien par e-mail, mot de passe perdu]
related: [auth-login, faq-account, users-manage]
---
Si vous ne connaissez plus votre mot de passe, choisissez-en un nouveau vous-même grâce à un lien envoyé à votre adresse e-mail.

![La page Mot de passe oublié](shot:auth-forgot-password)

1. Sur la page de connexion, cliquez sur **Mot de passe oublié ?** (à côté de **Mot de passe**).
2. Saisissez l’e-mail de votre compte dans **E-mail**.
3. Cliquez sur **Envoyer le lien**. La page confirme qu’un lien est en route.
4. Ouvrez l’e-mail **Réinitialiser votre mot de passe** et cliquez sur **Choisir un nouveau mot de passe**. Regardez dans les courriers indésirables s’il n’est pas dans la boîte de réception.
5. Saisissez deux fois votre nouveau mot de passe (au moins 8 caractères) : **Nouveau mot de passe** et **Confirmer le nouveau mot de passe**.
6. Cliquez sur **Enregistrer le nouveau mot de passe**, puis sur **Se connecter** avec le nouveau mot de passe.

![Choisir le nouveau mot de passe](shot:auth-reset-password)

## Bon à savoir

- Le lien ne sert **qu’une fois** et expire au bout de **30 minutes**. Une nouvelle demande remplace le lien précédent.
- L’e-mail est écrit dans la langue affichée sur la page au moment de la demande.
- Par sécurité, la page affiche le même message que l’adresse ait un compte ou non.
- Enregistrer le nouveau mot de passe **déconnecte tous les appareils** connectés à votre compte, et débloque un compte verrouillé après trop d’essais.
- Si l’authentification à deux facteurs est activée, l’application demande toujours votre code à 6 chiffres à la connexion.
- 3 liens par heure au maximum pour un même compte.

## Messages d’erreur

- **Ce lien n’est pas valide ou a expiré. Demandez-en un nouveau.** : le lien a déjà servi, date de plus de 30 minutes, ou a été remplacé par un plus récent. Cliquez sur **Demander un nouveau lien**.
- **Les deux mots de passe sont différents** : saisissez le même mot de passe dans les deux champs.

> **Astuce :** pas d’e-mail après quelques minutes ? Vérifiez l’adresse saisie. Un responsable peut aussi vous définir un nouveau mot de passe dans **Utilisateurs** (voir [Réinitialiser le mot de passe](topic:users-manage)).
