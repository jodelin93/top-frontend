---
id: offline-sync
title: Envoi des ventes hors ligne au retour de la connexion
category: Hors ligne
order: 502
routes: [/pos]
keywords: [synchronisation, envoi, ventes en attente, envoyer maintenant, OFFLINE, à vérifier, exporter les ventes non synchronisées]
related: [offline-mode, devices, review-queue]
---
Dès que la connexion revient, la caisse envoie les ventes toute seule, puis réessaie régulièrement s'il en reste. Tant que des ventes attendent, l'indicateur affiche leur nombre, par exemple **En ligne · 1 en attente**.

1. Cliquez sur l'indicateur **En ligne** / **Hors ligne**.
2. La fenêtre **Ventes hors ligne** liste les ventes restées sur l'appareil, avec leur numéro, leur heure et leur montant.
3. Cliquez sur **Envoyer maintenant** pour forcer l'envoi.

![La fenêtre Ventes hors ligne](shot:pos-offline-sales)

| État affiché | Signification | Que faire |
| --- | --- | --- |
| **En attente d'envoi** | La vente sera envoyée automatiquement. | Rien. Gardez l'appareil allumé et connecté. |
| **Envoi reporté, prochain essai à …** | Le serveur n'a pas pu être joint. | Vérifiez la connexion. |
| **À vérifier** | Le serveur a refusé la vente, avec la raison. | Faites corriger la cause par un gérant, puis **Réessayer**. |

Une fois envoyées, les ventes passent dans la liste **Envoyées** avec le numéro provisoire et le numéro définitif, par exemple **OFFLINE-321E10D8 → MAIN-000008**. Dans **Administration** > **Ventes**, vous pouvez chercher une vente par son numéro hors ligne.

> **Attention :** n'effacez jamais les données du navigateur tant que des ventes attendent : elles seraient perdues. La déconnexion, elle, garde les ventes en attente.

> **Astuce :** si une caisse ne peut plus se connecter du tout, un gérant clique sur **Exporter les ventes non synchronisées** dans cette fenêtre (approbation demandée). Le fichier est importé par un administrateur dans [Appareils](topic:devices).

Les ventes hors ligne qui dépassent le stock réel ou les limites arrivent dans la [File de contrôle](topic:review-queue).
