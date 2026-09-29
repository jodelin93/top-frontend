---
id: employees
title: Gérer les employés
category: Personnel
order: 1201
routes: [/admin/employees]
keywords: [employé, personnel, fiche employé, matricule, poste, succursales, date d'embauche, désactiver, départ, réactiver]
related: [employees-attendance, users-invitations]
---
Un **employé** est une personne qui travaille pour le magasin (poste, succursales, heures). Un **utilisateur** est un compte de connexion avec un rôle (voir [Ajouter un utilisateur](topic:users-invitations)). Un employé peut avoir un compte ou non : un agent d'entretien a une fiche pour ses heures, un caissier a les deux, liés.

> **Attention :** la page **Employés** demande le droit de gérer les employés (propriétaire, administrateur, gérant). Pour lier un compte utilisateur, il faut aussi le droit **Gérer les comptes du personnel**.

![La liste des employés](shot:admin-employees)

## Ajouter un employé

1. Cliquez sur **Ajouter un employé**.
2. Remplissez **Prénom** et **Nom** (obligatoires).
3. Complétez si besoin **Poste**, **Matricule** (unique), **Téléphone**, **E-mail** et **Date d'embauche** (au plus un an à l'avance).
4. Dans **Compte utilisateur**, choisissez le compte avec lequel la personne se connecte, ou **Aucun compte**.
5. Sous **Succursales**, cochez les succursales où la personne travaille et choisissez la **Principale**.
6. Ajoutez des **Notes (facultatif)**, puis cliquez sur **Enregistrer**.

> **Attention :** un compte utilisateur ne peut être lié qu'à un seul employé. Un gérant limité à certaines succursales ne peut affecter un employé qu'à ses succursales.

## Rechercher et modifier

Tapez un nom, un matricule ou un e-mail dans **Rechercher par nom, code ou e-mail**, filtrez par statut ou succursale, puis cliquez sur le crayon de la ligne.

## Désactiver un employé qui part

On ne supprime jamais un employé : on le désactive.

1. Cliquez sur l'icône rouge (personne barrée) de la ligne.
2. Indiquez le **Dernier jour** (pas dans le futur, et pas avant la date d'embauche) et un **Motif (facultatif)**.
3. Cliquez sur **Désactiver**.

Un pointage en cours est clôturé. Si l'employé a un compte, ce compte est suspendu et déconnecté de tous les appareils. Pour le faire revenir, filtrez sur **Inactif** puis cliquez sur **Réactiver**.
