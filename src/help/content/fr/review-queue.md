---
id: review-queue
title: La file de contrôle
category: Ventes et dépenses
order: 607
routes: [/admin/review]
keywords: [file de contrôle, dossier, à vérifier, hors ligne, au-delà du stock, clôturer le dossier, résolu, classer sans suite]
related: [offline-sync, devices, inventory-adjust]
---
La **File de contrôle** liste les ventes acceptées hors ligne qui doivent être vérifiées. La vente est déjà enregistrée : on corrige la cause, puis on clôture le dossier avec une note.

![La file de contrôle](shot:admin-review)

| Type de dossier | Ce qui s'est passé | Que faire |
| --- | --- | --- |
| Vendu hors ligne au-delà du stock | La caisse a vendu plus que le stock | Compter le rayon, ajuster le stock, puis clôturer |
| Remise ou prix hors ligne non approuvé | Remise ou prix changé hors ligne sans le droit | Vérifier avec le caissier, puis clôturer |
| Envoyée après la clôture de sa session de caisse | La vente n'est pas dans le comptage | Vérifier l'argent de la session, puis clôturer |
| Vendue hors ligne sans session de caisse ouverte | Aucune session n'était ouverte | Rattacher l'argent à la bonne session |
| Vendu hors ligne en dehors de l'autorisation de la caisse | Vente faite après la fin de l'autorisation hors ligne | Vérifier la caisse et la vente |
| Caisse déclarée perdue | Un appareil perdu avait des ventes non envoyées | Estimer les ventes perdues, puis clôturer |

1. Dans le menu, cliquez sur **File de contrôle**.
2. Gardez le filtre **Ouverte** pour voir les dossiers à traiter ; choisissez un type si besoin.
3. Cliquez sur le numéro de vente pour ouvrir la vente. Pour un problème de stock, cliquez sur **Ouvrir l'inventaire**.
4. Cliquez sur **Clôturer le dossier**, écrivez dans **Note** ce qui a été vérifié (obligatoire).
5. Cliquez sur **Marquer comme résolu**, ou sur **Classer sans suite (rien à faire)**.

> **Astuce :** chaque type est traité par qui en a le droit : le stock par qui ajuste l'inventaire, la caisse par qui gère les sessions. Traitez la file chaque jour.
