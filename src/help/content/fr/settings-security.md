---
id: settings-security
title: Hors ligne et sécurité
category: Paramètres
order: 1310
routes: [/admin/settings?tab=security, /admin/settings]
keywords: [hors ligne, durée hors ligne, limites hors ligne, sécurité, double authentification obligatoire, 2FA, administrateurs, prise d'effet]
related: [offline-mode, account-2fa, settings-history]
---
1. Ouvrez l'onglet **Hors ligne et sécurité**.
2. Réglez la **Durée de vente hors ligne (heures)** : après ce délai sans connexion, la caisse se verrouille.
3. Réglez si besoin **Vente hors ligne maximale**, **Ventes hors ligne par période** et **Total des ventes hors ligne par période** (0 = sans limite).
4. Cochez **Exiger l'authentification à deux facteurs pour les administrateurs** si vous voulez l'imposer.
5. Dans **Prise d'effet**, laissez vide pour appliquer tout de suite, ou choisissez une date future.
6. Ajoutez une **Note (facultative)**, puis cliquez sur **Enregistrer**.

![L'onglet Hors ligne et sécurité](shot:settings-security)

| Réglage | Signification |
| --- | --- |
| **Durée de vente hors ligne (heures)** | Combien de temps une caisse peut vendre sans connexion. |
| **Vente hors ligne maximale** | Au-delà, la vente est enregistrée mais envoyée dans la [File de contrôle](topic:review-queue). |
| **Ventes hors ligne par période** | Nombre maximal de ventes hors ligne avant de devoir se reconnecter. |
| **Total des ventes hors ligne par période** | Montant total maximal vendu hors ligne. |

Quand la double authentification est obligatoire, les personnes qui gèrent les utilisateurs, les rôles, les paramètres ou le journal d'audit doivent l'activer : tant qu'elles ne l'ont pas fait, elles arrivent sur **Sécurité du compte** à la connexion.

> **Attention :** prévenez les administrateurs avant de cocher cette case : chacun doit avoir une application d'authentification sur son téléphone (voir [Activer la double authentification](topic:account-2fa)).
