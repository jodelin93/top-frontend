---
id: customers-accounts
title: Comptes à crédit des clients et paiements
category: Clients
order: 1104
routes: [/admin/customers/accounts, /admin/customers/accounts?tab=aging]
keywords: [compte client, crédit, solde, limite de crédit, ancienneté, relevé, encaisser un paiement, ajuster le solde, blocage du crédit, créances]
related: [pos-on-account, customers-gift-cards, customers-profile]
---
Un client à crédit peut acheter « en compte » et payer plus tard, dans sa limite de crédit. La page **Comptes clients** demande le droit de voir les soldes.

![Les soldes clients par ancienneté](shot:customer-accounts)

## Voir tous les soldes

1. Dans le menu, cliquez sur **Comptes clients**.
2. L'onglet **Ancienneté** liste les clients qui doivent de l'argent, classés par retard.
3. Choisissez **Avec un solde** ou **Tous les comptes**.

> **Astuce :** relancez en priorité les colonnes 61 à 90 jours et 90+ jours.

## Le compte d'un client

1. Ouvrez la fiche du client, onglet **Compte**.
2. Lisez le **Solde**, la **Limite de crédit**, le **Crédit disponible** et les **Conditions de paiement**.
3. Le tableau par ancienneté montre le **Non échu**, puis les retards de **1 à 30 jours**, **31 à 60 jours**, etc.
4. Les **Écritures du compte** listent chaque vente en compte et chaque paiement.

> **Astuce :** cochez **Blocage du crédit (aucune nouvelle vente en compte)** dans la fiche d'un mauvais payeur.

## Encaisser un paiement sur le compte

1. Dans l'onglet **Compte**, cliquez sur **Encaisser un paiement**.
2. Saisissez le **Montant**, choisissez **Payé par** et, si besoin, une **Référence**.
3. Pour des espèces, choisissez la **Caisse** : le paiement entre dans sa session ouverte.
4. Cliquez sur **Enregistrer le paiement**.

> **Attention :** un paiement sans espèces de plus de 500 qui efface une dette demande l'approbation d'une deuxième personne. **Ajuster le solde** (+ le client doit plus, − il doit moins, motif obligatoire) est réservé au gérant ou à l'administrateur.

## Imprimer un relevé

1. Dans **Compte**, rubrique **Relevé**, choisissez les dates **Du** et **Au** (la date de début ne peut pas dépasser la date de fin).
2. Cliquez sur **Afficher le relevé** : **Solde d'ouverture**, opérations, **Solde de clôture**.
3. Cliquez sur **Imprimer** (ou enregistrez en PDF) et remettez-le au client.

> **Astuce :** un client peut régler son compte en gourdes. Dans **Encaisser un paiement**, choisissez **HTG** à côté du montant et tapez le montant en gourdes : l'application affiche sa valeur en dollars au taux de vente, et c'est ce montant qui est déduit du solde. En espèces, les gourdes vont dans les gourdes du tiroir.
