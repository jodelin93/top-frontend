---
id: offline-mode
title: Vendre hors ligne
category: Hors ligne
order: 501
routes: [/pos]
keywords: [hors ligne, sans internet, coupure, connexion, offline, autorisation hors ligne, bail, suspendue, verrouillée, reçu provisoire]
related: [offline-sync, settings-security, devices, faq-offline]
---
La caisse garde sur l'appareil une copie des produits, des prix, des taxes et du stock. Si Internet coupe, vous continuez à vendre : chaque vente est enregistrée sur l'appareil puis envoyée au serveur dès le retour de la connexion.

Pour vendre hors ligne, la caisse doit avoir reçu une **autorisation hors ligne** pendant qu'elle était en ligne. Elle est renouvelée automatiquement quand la caisse est connectée et reste valable un certain temps (24 heures par défaut, voir [Hors ligne et sécurité](topic:settings-security)).

## Vendre sans Internet

Quand la connexion tombe, l'indicateur en haut passe de **En ligne** (vert) à **Hors ligne** (orange). Un bandeau peut rappeler l'heure limite.

![La caisse hors ligne](shot:pos-offline)

1. Scannez ou cherchez les produits comme d'habitude (la recherche par nom, SKU ou code-barres marche hors ligne).
2. Cliquez sur **Encaisser**.
3. Encaissez en espèces, par carte ou MonCash, puis cliquez sur **Finaliser la vente**.
4. La fenêtre **Vente terminée** indique « Enregistrée hors ligne ». Le reçu porte un numéro provisoire qui commence par **OFFLINE-**. Remettez-le au client comme d'habitude.

## Ce qui ne marche pas hors ligne

| Fonction | Pourquoi |
| --- | --- |
| Paniers en attente | Ils sont gardés sur le serveur. |
| Cartes cadeaux (vente et paiement) | Le serveur vérifie le code et le solde. |
| Points, vente en compte, avoir | Le serveur vérifie le solde du client. |
| Rechercher ou créer un client | La vente continue en client de passage. |
| Codes promo | Le serveur valide le code. |
| Approbation d'un gérant | Elle passe par le serveur. |
| Retours et annulations | Le bouton **Retours** est grisé. |

> **Attention :** hors ligne, la caisse ne vend pas plus que le stock qu'elle connaît (« Seulement … en stock sur cette caisse (hors ligne) »). Un paiement en devise utilise le taux gardé sur la caisse.

## Quand la vente hors ligne est suspendue

Si la caisse reste hors ligne trop longtemps, l'écran se verrouille : **La vente hors ligne est suspendue**. Causes possibles : l'autorisation a expiré, l'heure de l'appareil a reculé, ou la caisse a été désactivée. Les ventes déjà faites restent en sécurité. Reconnectez-vous puis cliquez sur **Réessayer**.

> **Attention :** une caisse neuve doit être ouverte au moins une fois avec Internet, sinon elle ne peut pas vendre hors ligne.
