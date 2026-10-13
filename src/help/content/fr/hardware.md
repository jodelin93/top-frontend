---
id: hardware
title: "Matériel : imprimante, tiroir-caisse et lecteur"
category: Matériel et système
order: 1401
routes: [/admin/hardware]
keywords: [JodaPrint, agent d'impression, imprimante USB, matériel, imprimante, imprimante thermique, imprimante d'étiquettes, étiquettes, pont d'impression, code d'association, tiroir-caisse, lecteur de codes-barres, scanner, afficheur client]
related: [faq-hardware, customer-display, settings-receipts]
---
Les reçus s'impriment directement sur l'imprimante thermique grâce à **JodaPrint**, un petit programme installé sur l'ordinateur de la caisse. Il fonctionne avec les imprimantes USB et réseau et ouvre le tiroir-caisse. Sans lui, les reçus passent par la fenêtre d'impression du navigateur. La page **Matériel** demande le droit de gérer le matériel (propriétaire, administrateur, gérant).

![La page Matériel](shot:admin-hardware)

## Imprimer avec JodaPrint

L'agent JodaPrint est installé et activé une fois sur chaque ordinateur de caisse. Ensuite :

1. Dans l'administration, cliquez sur **Matériel**.
2. Sous **Imprimante de reçus (JodaPrint)**, vérifiez le statut **Connecté · version …**.
3. Choisissez l'imprimante de reçus dans la liste et sa **Largeur du papier** (80 mm ou 58 mm). L'imprimante qui porte l'alias « receipt » dans le tableau de bord JodaPrint est choisie d'office.
4. Cliquez sur **Imprimer un ticket de test**.

| Statut | Signification |
| --- | --- |
| Connecté · version … | Tout fonctionne : les reçus sortent sans fenêtre d'impression. |
| Introuvable sur cet ordinateur | L'agent n'est pas installé ou pas démarré. Cliquez sur **Télécharger JodaPrint**, installez-le, puis **Actualiser**. |
| Installé, non activé | Activez l'agent avec votre compte JodaPrint. |
| Refusé par l'agent | L'adresse de la caisse n'est pas autorisée : ajoutez-la dans le tableau de bord JodaPrint (**Developers › Origins & security**). |
| Non configuré sur le serveur de la caisse | Le technicien doit ajouter la clé de signature JodaPrint sur le serveur. |

> **Attention :** sans connexion à Internet, la caisse ne peut pas faire signer l'impression : les reçus passent alors par la fenêtre d'impression du navigateur, et le tiroir s'ouvre avec sa clé.

> **Astuce :** l'imprimante et la largeur du papier sont gardées dans le navigateur de la caisse : choisissez-les sur chaque caisse.

## Imprimante d'étiquettes

Les étiquettes de produits (1 × 1 pouce) s'impriment sur une imprimante d'étiquettes grâce à JodaPrint, sans la fenêtre d'impression du navigateur.

1. Dans le tableau de bord JodaPrint, donnez l'alias **label** à l'imprimante d'étiquettes. Elle est alors choisie d'office.
2. Sur la page **Matériel**, sous **Imprimante d'étiquettes**, vérifiez que la bonne imprimante est choisie, ou choisissez-la dans la liste.
3. Chargez un rouleau d'étiquettes de 1 × 1 pouce et cliquez sur **Imprimer une étiquette de test**.

Les étiquettes s'impriment depuis la liste des produits : voir [La liste des produits et les étiquettes](topic:products-list).

> **Astuce :** l'imprimante d'étiquettes se choisit sur chaque ordinateur. Faites-le une fois sur chaque ordinateur qui imprime des étiquettes.

## Ancienne méthode : le pont d'impression

Le **pont d'impression** est l'ancienne façon d'imprimer, pour les imprimantes réseau seulement. Les caisses qui utilisent JodaPrint n'en ont pas besoin.

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
