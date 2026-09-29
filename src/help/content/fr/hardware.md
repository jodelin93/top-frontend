---
id: hardware
title: "Matériel : imprimante, tiroir-caisse et lecteur"
category: Matériel et système
order: 1401
routes: [/admin/hardware]
keywords: [matériel, imprimante, imprimante thermique, pont d'impression, code d'association, tiroir-caisse, lecteur de codes-barres, scanner, afficheur client]
related: [faq-hardware, customer-display, settings-receipts]
---
Le **pont d'impression** est un petit programme installé sur le PC de la caisse. Il envoie les reçus à l'imprimante thermique et ouvre le tiroir-caisse. Sans lui, les reçus passent par la fenêtre d'impression du navigateur. La page **Matériel** demande le droit de gérer le matériel (propriétaire, administrateur, gérant).

![La page Matériel](shot:admin-hardware)

## Associer le pont d'impression

L'installation du pont est faite une fois par votre technicien. Ensuite, sur le PC de la caisse :

1. Démarrez le pont d'impression : sa fenêtre affiche un **code d'association** à 6 chiffres.
2. Dans l'administration, cliquez sur **Matériel**.
3. Sous **Imprimante de tickets (pont d'impression)**, tapez le code dans **Code d'association**.
4. Laissez l'**Adresse du pont** telle quelle (http://127.0.0.1:17777), sauf avis du technicien.
5. Cliquez sur **Associer**. Le statut passe à **Associé**.
6. Cliquez sur **Imprimer un ticket de test**.

| Statut | Signification |
| --- | --- |
| Arrêté | Le pont ne tourne pas sur ce PC. Démarrez-le. |
| En marche, non associé à ce navigateur | Tapez le code d'association. |
| Associé · version … | Tout fonctionne. |

> **Attention :** l'association est propre à chaque navigateur et à chaque caisse : refaites-la si vous changez de PC ou de navigateur. **Dissocier** retire l'association.

> **Astuce :** après plusieurs codes faux, le pont affiche un nouveau code. Après 10 erreurs, il faut le redémarrer en mode association.

## Tiroir, lecteur et afficheur

- **Tiroir-caisse** : **Tester l'ouverture du tiroir** envoie une seule impulsion. Vérifiez que personne ne se tient devant.
- **Lecteur de codes-barres** : réglez le suffixe (**Entrée**, **Tabulation** ou rien), le nombre minimum de caractères et les délais, puis cliquez sur **Enregistrer les réglages du scanner**. Testez dans **Test du scanner**.
- **Afficheur client** : **Ouvrir l'afficheur client** ouvre une deuxième fenêtre à placer sur l'écran tourné vers le client (voir [L'écran client](topic:customer-display)).

Ces réglages sont gardés dans le navigateur de la caisse : faites-les sur chaque caisse. La page liste aussi les **Appareils pris en charge**.
