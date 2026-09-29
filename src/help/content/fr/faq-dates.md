---
id: faq-dates
title: Pourquoi une date est-elle refusée ?
category: Questions fréquentes
order: 1607
routes: []
keywords: [date refusée, date dans le passé, date dans le futur, date de fin, période, du au, validité, échéance, date de naissance]
related: [expenses-create, purchasing-invoices, price-lists, discounts-admin, estimates]
---
Pour éviter les erreurs de saisie, l'application contrôle les dates. Souvent, le calendrier ne propose même pas les dates interdites.

| Où | Règle | Message |
| --- | --- | --- |
| Dépense : **Date** | Pas dans le futur | « La date de la dépense ne peut pas être dans le futur » |
| Facture fournisseur : **Date de facture** | Pas dans le futur | « La date de la facture ne peut pas être dans le futur » |
| Facture fournisseur : **Date d'échéance** | Pas avant la date de facture | « La date d'échéance ne peut pas précéder la date de facture. » |
| Paiement ou avoir fournisseur | Pas dans le futur | « La date ne peut pas être dans le futur » |
| Bon de commande : **Livraison prévue** | Pas dans le passé | « La date de livraison prévue ne peut pas être dans le passé » |
| Client : date de naissance | Pas dans le futur, pas avant 1900 | « La date ne peut pas être antérieure à 1900 » |
| Remise, liste de prix : fin de validité | Après le début et pas dans le passé | « Doit être après la date de début », « La date de fin ne peut pas être dans le passé » |
| Devis : **Valable jusqu'au** | Pas dans le passé | « La date de validité ne peut pas être dans le passé » |
| Paramètres : **Prise d'effet** | Dans le futur, ou vide | « Choisissez une date future ou laissez vide » |
| Employé : date d'embauche | Au plus un an à l'avance | « La date d'embauche ne peut pas dépasser un an à l'avance » |
| Employé : dernier jour | Pas dans le futur, pas avant l'embauche | « La date de départ est antérieure à la date d'embauche » |
| Présences : heures saisies | Pas dans le futur, sortie après arrivée, 24 h maximum | « L'heure ne peut pas être dans le futur »… |
| Périodes (rapports, ventes, sessions, relevés) | Début ≤ fin | La fin ne peut pas précéder le début |

> **Astuce :** une date déjà enregistrée qui est maintenant passée (par exemple la fin d'un ancien devis) peut être conservée telle quelle ; la règle s'applique quand vous saisissez ou changez la date.
