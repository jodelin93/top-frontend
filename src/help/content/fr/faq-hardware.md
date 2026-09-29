---
id: faq-hardware
title: "Questions fréquentes : imprimante et tiroir"
category: Questions fréquentes
order: 1605
routes: [/admin/hardware]
keywords: [imprimante ne répond pas, pas de reçu, tiroir ne s'ouvre pas, pont d'impression, papier, scanner ne marche pas]
related: [hardware, settings-payment-methods]
---
## L'imprimante ne répond pas

Ouvrez **Administration** > **Matériel** et lisez le **Statut** du pont d'impression :

- **Arrêté** : le pont n'est pas lancé sur ce PC. Démarrez-le ou redémarrez le PC.
- **En marche, non associé à ce navigateur** : tapez le code d'association affiché par le pont, puis **Associer**.
- **Associé** : vérifiez que l'imprimante est allumée, a du papier et est bien branchée.

Cliquez ensuite sur **Imprimer un ticket de test**. En attendant, les reçus s'impriment par la fenêtre d'impression du navigateur.

## Le tiroir-caisse ne s'ouvre pas

Le tiroir s'ouvre par l'imprimante de tickets : vérifiez d'abord l'imprimante. Il ne s'ouvre que pour les paiements réglés sur **Ouvre le tiroir-caisse** dans [Modes de paiement](topic:settings-payment-methods). Pour tester, utilisez **Tester l'ouverture du tiroir** dans **Matériel** : cliquez une seule fois, l'ouverture n'est jamais répétée automatiquement.

## Le lecteur de codes-barres ajoute de mauvais articles

Réglez le suffixe et le nombre minimum de caractères dans **Matériel** > **Lecteur de codes-barres**, puis vérifiez dans **Test du scanner** que le code lu est complet.
