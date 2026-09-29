---
id: auth-login
title: Se connecter
category: Premiers pas
order: 101
public: true
routes: [/auth/login, /]
keywords: [connexion, se connecter, identifiant, mot de passe, e-mail, compte, verrouillé, identifiants invalides]
related: [auth-mfa, faq-account, language, getting-started-roles]
---
Chaque employé possède son propre compte : une adresse e-mail et un mot de passe. Ne partagez jamais votre compte : chaque vente, chaque remise et chaque ouverture de tiroir est enregistrée à votre nom.

![Page de connexion en français](shot:auth-login)

1. Ouvrez l'adresse de l'application dans le navigateur (Chrome de préférence).
2. En haut à droite, cliquez sur **FR** pour afficher l'application en français.
3. Saisissez votre adresse dans le champ **E-mail**.
4. Saisissez votre mot de passe dans le champ **Mot de passe**.
5. Cliquez sur **Se connecter**.

Si la double authentification est activée sur votre compte, l'application demande ensuite un code à 6 chiffres (voir [Saisir le code de double authentification](topic:auth-mfa)).

## Où arrive-t-on après la connexion ?

| Rôle | Page d'arrivée |
| --- | --- |
| Caissier, gérant, administrateur, propriétaire | L'écran de caisse. Le bouton **Administration** mène à la gestion du magasin. |
| Comptable | Le **Tableau de bord** de l'administration (il ne vend pas). |
| Magasinier | L'**Inventaire** de l'administration (il ne vend pas). |

La connexion reste active sur cet appareil grâce à un cookie sécurisé : vous n'avez pas besoin de vous reconnecter à chaque ouverture. Cliquez sur **Se déconnecter** avant de laisser l'appareil à un collègue.

## Messages d'erreur

- **Identifiants invalides** : l'adresse ou le mot de passe est faux. Vérifiez la saisie (touche Majuscule) et réessayez.
- **Trop de tentatives échouées. Ce compte est verrouillé pendant quelques minutes.** : après 5 essais faux à la suite, le compte est bloqué 15 minutes. Voir [Compte verrouillé ou mot de passe oublié](topic:faq-account).
- **Trop de tentatives. Patientez quelques minutes puis réessayez.** : trop de connexions depuis cet appareil en peu de temps. Attendez un peu.

> **Attention :** chaque nouvel essai faux pendant le verrouillage le prolonge. Attendez sans réessayer.

> **Astuce :** si le lien **Nouveau ? Créer une boutique** apparaît sous le formulaire, ce serveur permet de créer un nouveau magasin (voir [Créer votre magasin](topic:auth-signup)).
