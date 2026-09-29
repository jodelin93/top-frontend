---
id: faq-sales
title: "Questions fréquentes : ventes et devises"
category: Questions fréquentes
order: 1604
routes: [/admin/sales]
keywords: [annuler une vente, annulation impossible, taux de change changé, reçu ancien, retour, devise]
related: [sales-void, returns-pos, settings-exchange-rate]
---
## Je ne peux pas annuler une vente

L'annulation demande le droit **Annuler des ventes** (gérant, administrateur, propriétaire) ; un caissier peut la faire avec l'approbation d'un responsable. Elle est aussi refusée quand :

- la session de caisse de la vente est déjà clôturée (ou, sans session, la vente a plus de 24 heures) ;
- la vente a déjà un retour ou un remboursement ;
- la vente a été payée par un terminal de carte connecté.

Dans ces cas, faites un [retour](topic:returns-pos) : il remet le stock et rembourse le client en gardant une trace propre.

> **Astuce :** un message de refus peut s'afficher en anglais, par exemple « This sale's shift is closed: use a return instead of a void » : la session est clôturée, faites un retour.

## Le taux de change a changé

Un responsable met le taux à jour sur la carte **Taux de change** (voir [Taux de change](topic:settings-exchange-rate)). Le nouveau taux s'applique tout de suite aux nouvelles ventes. Les ventes déjà faites gardent leur taux : un reçu ancien ne change jamais, et un retour suit le montant de la vente d'origine.

## Je ne vois pas les ventes d'une autre succursale

Votre compte est sans doute limité à certaines succursales. Demandez à un administrateur de modifier votre **Accès aux succursales** dans **Utilisateurs**.
