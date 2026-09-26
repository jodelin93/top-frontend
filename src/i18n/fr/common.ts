// French translations: common. Keys are the exact English texts passed to t().
export const common: Record<string, string> = {
  // Shared words
  'Loading...': 'Chargement...',
  Cancel: 'Annuler',
  Close: 'Fermer',
  Back: 'Retour',
  Continue: 'Continuer',
  'Try again': 'Réessayer',
  Language: 'Langue',
  Email: 'E-mail',
  Password: 'Mot de passe',
  'First name': 'Prénom',
  'Last name': 'Nom',
  Currency: 'Devise',
  Current: 'Actuel',
  Switch: 'Changer',
  On: 'Activée',
  Off: 'Désactivée',
  'Status:': 'Statut :',
  'Something went wrong': 'Une erreur est survenue',

  // Landing page
  'Point of Sale': 'Point de vente',
  'Fast and intuitive checkout experience with barcode scanning':
    'Encaissement rapide et intuitif avec lecture des codes-barres',
  'Inventory Management': "Gestion de l'inventaire",
  'Track stock levels, movements, and transfers across locations':
    'Suivez les niveaux de stock, les mouvements et les transferts entre sites',
  'Customer Management': 'Gestion des clients',
  'Manage customer profiles, loyalty points, and purchase history':
    "Gérez les fiches clients, les points de fidélité et l'historique d'achats",
  'Reports & Analytics': 'Rapports et analyses',
  'Real-time insights into sales, inventory, and customer trends':
    "Suivi en temps réel des ventes, de l'inventaire et des tendances clients",
  'Sign In': 'Se connecter',
  'Modern Point of Sale System': 'Système de point de vente moderne',
  'Streamline your retail operations with our comprehensive POS solution. Manage sales, inventory, customers, and analytics all in one place.':
    "Simplifiez la gestion de votre commerce avec notre solution de caisse complète. Gérez les ventes, l'inventaire, les clients et les analyses au même endroit.",
  'Get Started': 'Commencer',
  'Learn More': 'En savoir plus',
  'Ready to modernize your business?': 'Prêt à moderniser votre commerce ?',
  'Join thousands of businesses using Modern POS to streamline their operations.':
    'Rejoignez des milliers de commerces qui utilisent Modern POS pour simplifier leur activité.',
  'Sign In to Continue': 'Se connecter pour continuer',
  '© 2026 Modern POS. All rights reserved.': '© 2026 Modern POS. Tous droits réservés.',

  // Admin layout and navigation
  Admin: 'Administration',
  'Account security': 'Sécurité du compte',
  'Back to POS': 'Retour à la caisse',
  'Sign out': 'Se déconnecter',
  Sales: 'Ventes',
  Catalog: 'Catalogue',
  Stock: 'Stock',
  People: 'Personnes',
  System: 'Système',
  Dashboard: 'Tableau de bord',
  Reports: 'Rapports',
  Estimates: 'Devis',
  Returns: 'Retours',
  'Shifts & cash': 'Sessions et espèces',
  Expenses: 'Dépenses',
  'Card settlements': 'Règlements par carte',
  Products: 'Produits',
  Categories: 'Catégories',
  Import: 'Importation',
  'Price lists & tax': 'Listes de prix et taxes',
  Discounts: 'Remises',
  Inventory: 'Inventaire',
  Purchasing: 'Achats',
  Customers: 'Clients',
  Users: 'Utilisateurs',
  'Roles & permissions': 'Rôles et autorisations',
  Settings: 'Paramètres',
  Devices: 'Appareils',
  'Audit log': "Journal d'audit",

  // Sign in
  'Sign in to Modern POS': 'Connexion à Modern POS',
  'Enter your email and password to access your account':
    'Saisissez votre e-mail et votre mot de passe pour accéder à votre compte',
  'Invalid email address': 'Adresse e-mail invalide',
  'Password must be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères',
  'Invalid credentials': 'Identifiants invalides',
  'Signing in...': 'Connexion...',
  'Sign in': 'Se connecter',
  'New here?': 'Nouveau ?',
  'Create a store': 'Créer une boutique',

  // Two-factor verification at sign in
  'Two-Factor Authentication': 'Authentification à deux facteurs',
  'Enter the 6-digit code from your authenticator app':
    "Saisissez le code à 6 chiffres de votre application d'authentification",
  'Token must be 6 digits': 'Le code doit contenir 6 chiffres',
  'Invalid verification code': 'Code de vérification invalide',
  'Verification Code': 'Code de vérification',
  'Verifying...': 'Vérification...',
  Verify: 'Vérifier',
  'Back to Login': 'Retour à la connexion',

  // Sign-up
  'Create your store': 'Créez votre boutique',
  'You become the owner. A branch, a register and Cash/Card payments are set up for you.':
    'Vous en devenez le propriétaire. Une succursale, une caisse et les paiements Espèces/Carte sont configurés pour vous.',
  'Sign-up is not available on this server. Ask your administrator for an account.':
    "L'inscription n'est pas disponible sur ce serveur. Demandez un compte à votre administrateur.",
  'Back to sign in': 'Retour à la connexion',
  'Store name': 'Nom de la boutique',
  'Enter your store name': 'Saisissez le nom de votre boutique',
  'At least 8 characters': 'Au moins 8 caractères',
  'Use a 3-letter currency code, e.g. USD': 'Utilisez un code de devise à 3 lettres, par ex. USD',
  'Already have an account? Use its email and current password to add this store to it.':
    'Vous avez déjà un compte ? Utilisez son e-mail et son mot de passe actuel pour y ajouter cette boutique.',
  'Could not create the store': 'Impossible de créer la boutique',
  'Creating store...': 'Création de la boutique...',
  'Create store': 'Créer la boutique',
  'Already have a store?': 'Vous avez déjà une boutique ?',

  // Account security
  'Could not start two-factor setup': "Impossible de démarrer la configuration de l'authentification à deux facteurs",
  'Two-factor authentication is on. You will be asked for a code each time you sign in.':
    "L'authentification à deux facteurs est activée. Un code vous sera demandé à chaque connexion.",
  'That code is not valid. Check the time on your phone and try again.':
    "Ce code n'est pas valide. Vérifiez l'heure de votre téléphone et réessayez.",
  'Two-factor authentication is off.': "L'authentification à deux facteurs est désactivée.",
  'That code is not valid': "Ce code n'est pas valide",
  'Two-factor authentication is required': "L'authentification à deux facteurs est obligatoire",
  'Your store requires two-factor authentication for staff who manage users, roles, settings or the audit log. Turn it on below to continue.':
    "Votre boutique exige l'authentification à deux facteurs pour le personnel qui gère les utilisateurs, les rôles, les paramètres ou le journal d'audit. Activez-la ci-dessous pour continuer.",
  'Two-factor authentication': 'Authentification à deux facteurs',
  'Protect {account} with a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, ...).':
    "Protégez {account} avec un code à 6 chiffres issu d'une application d'authentification (Google Authenticator, Microsoft Authenticator, 1Password, ...).",
  'your account': 'votre compte',
  'Turn off': 'Désactiver',
  'Starting...': 'Démarrage...',
  'Turn on': 'Activer',
  'Open your authenticator app and scan this QR code.':
    "Ouvrez votre application d'authentification et scannez ce code QR.",
  'Enter the 6-digit code the app shows to finish.':
    "Saisissez le code à 6 chiffres affiché par l'application pour terminer.",
  'QR code for your authenticator app': "Code QR pour votre application d'authentification",
  "Can't scan? Enter this key manually:": 'Impossible de scanner ? Saisissez cette clé manuellement :',
  'Verification code': 'Code de vérification',
  'Verify and turn on': 'Vérifier et activer',
  'Enter a current code from your authenticator app to turn two-factor off.':
    "Saisissez un code actuel de votre application d'authentification pour désactiver l'authentification à deux facteurs.",
  'Turning off...': 'Désactivation...',
  Stores: 'Boutiques',
  'Your account belongs to several stores. Choose the one to work in.':
    'Votre compte appartient à plusieurs boutiques. Choisissez celle dans laquelle travailler.',
  'Could not switch store': 'Impossible de changer de boutique',
  "Where you're signed in": 'Où vous êtes connecté',
  "Sign out anything you don't recognise. Sessions also end on their own when they expire.":
    "Déconnectez tout ce que vous ne reconnaissez pas. Les sessions se terminent aussi d'elles-mêmes à leur expiration.",
  'Could not load your sessions': 'Impossible de charger vos sessions',
  'Could not sign out': 'Impossible de se déconnecter',
  'This device': 'Cet appareil',
  'Signed in {created} · last active {lastSeen}': 'Connecté le {created} · dernière activité le {lastSeen}',
  'Sign out of this device': 'Se déconnecter de cet appareil',
  'Sign out this session': 'Déconnecter cette session',
  'No active sessions.': 'Aucune session active.',
  'Signing out...': 'Déconnexion...',
  'Sign out everywhere else ({count})': 'Se déconnecter partout ailleurs ({count})',
  'Unknown device': 'Appareil inconnu',
  'API client': 'Client API',
  Browser: 'Navigateur',
  '{browser} on {os}': '{browser} sur {os}',

  // Manager approval
  'Manager approval needed': 'Approbation du gérant requise',
  "You don't have permission to:": "Vous n'avez pas l'autorisation de :",
  'A manager can approve this once by entering their own credentials.':
    'Un gérant peut approuver cette action une fois en saisissant ses propres identifiants.',
  'Manager email': 'E-mail du gérant',
  'Two-factor code': 'Code à deux facteurs',
  'Only if the manager has two-factor authentication on':
    "Uniquement si le gérant a activé l'authentification à deux facteurs",
  'Approval failed': "L'approbation a échoué",
  'Checking...': 'Vérification...',
  Approve: 'Approuver',

  // Offline selling
  'Offline selling is paused': 'La vente hors ligne est suspendue',
  'An administrator revoked this till, so it cannot sell without a connection.':
    'Un administrateur a révoqué cette caisse : elle ne peut pas vendre sans connexion.',
  'This till has not been registered for offline selling yet.':
    "Cette caisse n'a pas encore été enregistrée pour la vente hors ligne.",
  'This till was allowed to sell offline until {date}. That time has passed.':
    "Cette caisse était autorisée à vendre hors ligne jusqu'au {date}. Ce délai est dépassé.",
  'This till has no offline permission yet.': "Cette caisse n'a pas encore d'autorisation hors ligne.",
  'Reconnect to the internet to continue selling. Sales already rung up are safe on this device and upload automatically.':
    'Reconnectez-vous à Internet pour continuer à vendre. Les ventes déjà enregistrées sont conservées sur cet appareil et seront envoyées automatiquement.',
  'Waiting for a connection…': 'En attente de connexion…',
  'This till was revoked by an administrator: it cannot sell offline. Ask a manager to restore it under Admin → Devices.':
    'Cette caisse a été révoquée par un administrateur : elle ne peut pas vendre hors ligne. Demandez à un gérant de la rétablir dans Administration → Appareils.',
  'Offline: you can keep selling until {date}. Reconnect before then.':
    "Hors ligne : vous pouvez continuer à vendre jusqu'au {date}. Reconnectez-vous d'ici là.",
  'This till has not been registered yet. Connect to the internet once to enable offline selling.':
    "Cette caisse n'a pas encore été enregistrée. Connectez-vous une fois à Internet pour activer la vente hors ligne.",
  'This till was revoked by an administrator and cannot sell offline.':
    'Cette caisse a été révoquée par un administrateur et ne peut pas vendre hors ligne.',
  'Offline selling has expired on this till. Reconnect to the internet to continue selling.':
    'La vente hors ligne a expiré sur cette caisse. Reconnectez-vous à Internet pour continuer à vendre.',
  'The server rejected this sale': 'Le serveur a refusé cette vente',

  // Estimates
  'No customer': 'Aucun client',

  // Cash movements (MOVEMENT_LABELS)
  'Opening float': 'Fonds de caisse',
  'Paid in': "Entrée d'espèces",
  'Paid out': "Sortie d'espèces",
  'Safe drop': 'Dépôt au coffre',
  'Expense payout': 'Paiement de dépense',
  'Cash refund': 'Remboursement en espèces',

  // Expense payment methods (PAYMENT_METHOD_LABELS)
  Cash: 'Espèces',
  Card: 'Carte',
  'Bank transfer': 'Virement bancaire',
  Other: 'Autre',

  // Customer merge fields (MERGE_FIELDS)
  Type: 'Type',
  Company: 'Entreprise',
  Phone: 'Téléphone',
  'Tax number': 'Numéro fiscal',
  'Date of birth': 'Date de naissance',
  Group: 'Groupe',
  'Credit limit': 'Limite de crédit',
};
