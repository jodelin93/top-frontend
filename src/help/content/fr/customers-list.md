---
id: customers-list
title: Rechercher et créer un client
category: Clients
order: 1101
routes: [/admin/customers, /admin/customers?tab=customers]
keywords: [client, clients, nouveau client, particulier, entreprise, consentement marketing, e-mail, SMS, limite de crédit, doublon]
related: [customers-profile, customers-groups, customers-privacy, pos-customer]
---
La page **Administration** > **Clients** est réservée aux personnes qui peuvent modifier les clients (propriétaire, administrateur, gérant). Les caissiers recherchent et ajoutent des clients depuis la caisse. Les onglets sont **Clients**, **Doublons possibles**, **Groupes** et **Champs personnalisés**.

![La liste des clients](shot:admin-customers)

## Rechercher

1. Tapez un nom, un code, un e-mail ou un téléphone dans la recherche.
2. Filtrez si besoin par statut (**Actif**, **Inactif**, **Bloqué**) ou par groupe.
3. Le tableau affiche le groupe, les **Points** et la date du **Dernier achat**.
4. Cliquez sur l'œil pour ouvrir la [fiche](topic:customers-profile), ou sur le crayon pour la modifier.

## Créer un client

1. Cliquez sur **Nouveau client**.
2. Choisissez le **Type** : **Particulier** ou **Entreprise**. Laissez le **Code** vide : il sera créé automatiquement.
3. Saisissez **Prénom**, **Nom** (ou le nom de l'entreprise), **E-mail** et **Téléphone**. La date de naissance, facultative, ne peut pas être dans le futur ni avant 1900.
4. Pour un client à crédit, saisissez la **Limite de crédit** et les **Conditions de paiement (jours)**.
5. Choisissez le **Groupe** du client (ses prix de groupe s'appliqueront à la caisse).
6. Dans **Consentement marketing**, cochez **Accepte les e-mails marketing** et/ou **Accepte les SMS marketing** seulement si le client est d'accord, puis indiquez **Comment le consentement a-t-il été donné ?**.
7. Cliquez sur **Créer le client**.

![Le formulaire Nouveau client](shot:customer-form)

> **Attention :** n'envoyez jamais de message publicitaire à un client qui n'a pas donné son accord. Chaque changement de consentement est daté et gardé dans l'**Historique** du consentement.

> **Astuce :** si un client avec le même e-mail ou téléphone existe déjà, l'application vous prévient avant la création.
