---
id: purchasing-invoices
title: Enregistrer une facture fournisseur
category: Achats
order: 1004
routes: [/admin/purchasing?tab=invoices, /admin/purchasing]
keywords: [facture fournisseur, rapprochement à trois voies, écart de prix, échéance, solde d'ouverture, annuler la facture]
related: [purchasing-payments, purchasing-receive, faq-dates]
---
La facture est comparée au bon de commande et aux quantités reçues (rapprochement à trois voies).

![L'onglet Factures](shot:purchasing-invoices)

1. Cliquez sur l'onglet **Factures**, puis sur **Nouvelle facture**.
2. Choisissez le **Fournisseur** et le **Type** (**Facture** ou **Solde d'ouverture**).
3. Saisissez le **Numéro de facture fournisseur** et la **Date de facture** (pas dans le futur).
4. Laissez la **Date d'échéance** vide pour utiliser les conditions du fournisseur ; sinon, elle ne peut pas précéder la date de facture.
5. Choisissez le **Bon de commande** : ses lignes reçues s'affichent. Cochez les lignes facturées et vérifiez quantités et prix.
6. Pour des frais hors commande (transport…), cliquez sur **Ajouter une ligne**.
7. Cliquez sur **Enregistrer la facture**.

La fiche de la facture affiche l'**Écart de prix** et l'**Écart de qté** par rapport à la commande, puis le **Reste dû**.

> **Attention :** une facture sans écart (ou dans la tolérance) est approuvée tout de suite. Au-delà, elle reste **À approuver** : une autre personne que celle qui l'a saisie doit cliquer sur **Approuver**. Seule une facture approuvée peut être payée.

> **Astuce :** une facture erronée ne se supprime pas : cliquez sur **Annuler la facture** et indiquez la raison.
