---
id: devices
title: Les appareils (caisses enregistrées)
category: Matériel et système
order: 1402
routes: [/admin/devices]
keywords: [appareils, caisses, synchronisation, bail hors ligne, révoquer, déclarer perdu, renommer, importer des ventes non synchronisées]
related: [offline-sync, offline-mode, review-queue, settings-security]
---
Chaque navigateur qui ouvre la caisse s'enregistre comme un **appareil**. La page **Appareils** (propriétaire, administrateur) montre leur état.

![La page Appareils](shot:admin-devices)

1. En haut, trois compteurs : **Appareils actifs**, **Ventes hors ligne en attente** et **Appareils à surveiller**.
2. **État de la synchronisation** indique, par caisse, les ventes non synchronisées, les nouvelles tentatives, les ventes à vérifier et les cas à examiner.
3. Cliquez sur **Actualiser** pour mettre les chiffres à jour.

Plus bas, chaque appareil montre son **Statut**, sa **Dernière activité**, sa **Dernière synchronisation**, ses ventes **En attente** et la date **Hors ligne jusqu'au** (fin de son autorisation de vendre sans Internet). **Expiré** veut dire que la caisse ne s'est pas connectée depuis trop longtemps ; chaque reconnexion renouvelle l'autorisation.

> **Astuce :** un montant pas encore envoyé différent de 0 veut dire qu'une caisse garde des ventes hors ligne. Reconnectez-la dès que possible.

## Importer des ventes non synchronisées

Si une caisse ne peut plus se connecter, un gérant exporte ses ventes depuis la caisse (fenêtre **Ventes hors ligne**, **Exporter les ventes non synchronisées**).

1. Cliquez sur **Importer des ventes non synchronisées**.
2. Choisissez le fichier exporté et la caisse d'origine dans **Caisse d'où viennent les ventes**.
3. Cliquez sur **Importer**. Un résumé indique les ventes enregistrées, déjà reçues, à vérifier et à réessayer.

## Renommer, révoquer, déclarer perdu

| Bouton | Quand | Effet |
| --- | --- | --- |
| **Renommer** | Donner un nom clair (« Caisse 1 - comptoir ») | Aucun autre effet. |
| **Révoquer** | Une caisse ne doit plus vendre hors ligne (PC remplacé, doute) | Elle perd aussitôt ce droit ; les personnes connectées dessus sont déconnectées. **Rétablir** annule la révocation. |
| **Déclarer perdu** | PC ou tablette volé, perdu ou abandonné | Révocation définitive, sessions fermées, ventes non envoyées refusées ; un dossier « Caisse déclarée perdue » s'ouvre dans la [File de contrôle](topic:review-queue). |

> **Attention :** **Déclarer perdu** ne peut pas être annulé. Vérifiez avant s'il reste des ventes non envoyées et essayez de les exporter.
