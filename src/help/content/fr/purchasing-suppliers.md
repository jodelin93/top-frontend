---
id: purchasing-suppliers
title: Gérer les fournisseurs
category: Achats
order: 1001
routes: [/admin/purchasing?tab=suppliers, /admin/purchasing]
keywords: [fournisseur, contact, conditions de paiement, délai de livraison, devise, produits du fournisseur, préféré, bloqué]
related: [purchasing-orders, purchasing-reorder]
---
Tout le cycle d'achat se fait dans **Administration** > **Achats**. Les onglets visibles dépendent de vos permissions : **Bons de commande**, **Fournisseurs**, **Réapprovisionnement**, **Retours fournisseurs** (magasinier, gérant…) ; **Factures**, **Paiements**, **Dettes fournisseurs** (gérant, administrateur, propriétaire).

L'onglet **Fournisseurs** liste vos fournisseurs avec leur contact, leurs conditions de paiement, leur devise et leur statut.

![L'onglet Fournisseurs](shot:purchasing-suppliers)

1. Cliquez sur **Nouveau fournisseur**.
2. Saisissez le **Code** et le **Nom**, puis l'**E-mail**, le **Téléphone** et le **Numéro fiscal**.
3. Indiquez les **Conditions de paiement (jours net)**, par exemple 30.
4. Indiquez le **Délai de livraison (jours)** : il fixe la date prévue des nouvelles commandes.
5. Saisissez la **Devise** (USD, HTG…) ; vide = devise du magasin.
6. Complétez l'**Adresse**, la **Ville** et les **Contacts** (**Ajouter un contact**).
7. Cliquez sur **Enregistrer le fournisseur**.

> **Attention :** un fournisseur **Inactif** ou **Bloqué** ne peut plus recevoir de nouveaux bons de commande.

> **Astuce :** le bouton **Produits** d'un fournisseur note, pour chaque produit, le code fournisseur, le dernier coût, la quantité minimum de commande et s'il est le fournisseur **Préféré**. Ces informations servent au [réapprovisionnement](topic:purchasing-reorder).
