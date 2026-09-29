---
id: card-settlements
title: Rapprocher les règlements par carte
category: Ventes et dépenses
order: 606
routes: [/admin/payments]
keywords: [règlements par carte, rapprochement, relevé, banque, prestataire, CSV, lot, frais, régulariser, terminal de paiement]
related: [pos-payment-card, reports-reconciliation]
---
La page **Règlements par carte** compare les relevés de votre banque ou de votre prestataire avec les paiements par carte encaissés en caisse.

![La page Règlements par carte](shot:admin-payments)

## Importer un relevé

1. Dans le menu, cliquez sur **Règlements par carte**.
2. Sous **Importer un relevé de règlement**, choisissez le **Prestataire**.
3. Ajoutez une **Référence du lot (facultatif)**, par exemple « versement 2026-09-21 ».
4. Choisissez le **Fichier CSV** reçu du prestataire (colonnes de référence, montant, frais et date).
5. Cliquez sur **Importer**. Les lignes sont rapprochées des paiements par référence et par montant.

## Traiter ce qui reste « À rapprocher »

- **Lignes de règlement sans paiement** : des lignes du relevé qu'aucun paiement ne couvre. Choisissez le paiement correspondant et cliquez sur **Associer et régulariser**, ou expliquez pourquoi il n'y en a pas.
- **Paiements par carte pas encore réglés** : des paiements encaissés qu'aucun relevé ne couvre encore. Cliquez sur **Régulariser**, écrivez une **Note** (par exemple « Lot du terminal clôturé en retard »), puis confirmez.

> **Astuce :** en bas de la page, **Lots importés** liste les relevés déjà importés, avec le nombre de lignes rapprochées, le brut et les frais. **Terminal de paiement par mode de paiement** indique quel terminal est relié à chaque mode.
