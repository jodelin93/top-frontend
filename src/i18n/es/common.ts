// Spanish translations: common. Keys are the exact English texts passed to t().
export const common: Record<string, string> = {
  // Shared words
  'Loading...': 'Cargando...',
  Cancel: 'Cancelar',
  Close: 'Cerrar',
  Back: 'Volver',
  Continue: 'Continuar',
  'Try again': 'Reintentar',
  Language: 'Idioma',
  Email: 'Correo electrónico',
  Password: 'Contraseña',
  'First name': 'Nombre',
  'Last name': 'Apellido',
  Currency: 'Moneda',
  Current: 'Actual',
  Switch: 'Cambiar',
  On: 'Activada',
  Off: 'Desactivada',
  'Status:': 'Estado:',
  'Something went wrong': 'Ocurrió un error',

  // Landing page
  'Point of Sale': 'Punto de venta',
  'Fast and intuitive checkout experience with barcode scanning':
    'Cobro rápido e intuitivo con lectura de códigos de barras',
  'Inventory Management': 'Gestión de inventario',
  'Track stock levels, movements, and transfers across locations':
    'Controle los niveles de existencias, movimientos y transferencias entre sucursales',
  'Customer Management': 'Gestión de clientes',
  'Manage customer profiles, loyalty points, and purchase history':
    'Administre los perfiles de clientes, los puntos de lealtad y el historial de compras',
  'Reports & Analytics': 'Informes y análisis',
  'Real-time insights into sales, inventory, and customer trends':
    'Información en tiempo real sobre ventas, inventario y tendencias de clientes',
  'Sign In': 'Iniciar sesión',
  'Modern Point of Sale System': 'Sistema de punto de venta moderno',
  'Streamline your retail operations with our comprehensive POS solution. Manage sales, inventory, customers, and analytics all in one place.':
    'Simplifique la operación de su comercio con nuestra solución de punto de venta completa. Administre ventas, inventario, clientes y análisis en un solo lugar.',
  'Get Started': 'Comenzar',
  'Learn More': 'Más información',
  'Ready to modernize your business?': '¿Listo para modernizar su negocio?',
  'Join thousands of businesses using Modern POS to streamline their operations.':
    'Únase a miles de negocios que usan Modern POS para simplificar sus operaciones.',
  'Sign In to Continue': 'Iniciar sesión para continuar',
  '© 2026 Modern POS. All rights reserved.': '© 2026 Modern POS. Todos los derechos reservados.',

  // Admin layout and navigation
  Admin: 'Administración',
  'Account security': 'Seguridad de la cuenta',
  'Open menu': 'Abrir el menú',
  'Close menu': 'Cerrar el menú',
  'Admin menu': 'Menú de administración',
  'Back to POS': 'Volver a la caja',
  'Sign out': 'Cerrar sesión',
  Sales: 'Ventas',
  Catalog: 'Catálogo',
  Stock: 'Existencias',
  People: 'Personas',
  System: 'Sistema',
  Dashboard: 'Panel',
  Reports: 'Informes',
  Estimates: 'Cotizaciones',
  Returns: 'Devoluciones',
  'Shifts & cash': 'Turnos y efectivo',
  Expenses: 'Gastos',
  'Card settlements': 'Liquidaciones de tarjeta',
  Products: 'Productos',
  Categories: 'Categorías',
  Import: 'Importación',
  'Price lists & tax': 'Listas de precios e impuestos',
  Discounts: 'Descuentos',
  Inventory: 'Inventario',
  Purchasing: 'Compras',
  Customers: 'Clientes',
  Users: 'Usuarios',
  'Roles & permissions': 'Roles y permisos',
  Settings: 'Configuración',
  Devices: 'Dispositivos',
  'Audit log': 'Registro de auditoría',

  // Sign in
  'Sign in to Modern POS': 'Iniciar sesión en Modern POS',
  'Enter your email and password to access your account':
    'Ingrese su correo electrónico y su contraseña para acceder a su cuenta',
  'Invalid email address': 'Correo electrónico no válido',
  'Password must be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
  'Invalid credentials': 'Credenciales no válidas',
  'Signing in...': 'Iniciando sesión...',
  'Sign in': 'Iniciar sesión',
  'New here?': '¿Es nuevo?',
  'Create a store': 'Crear una tienda',

  // Two-factor verification at sign in
  'Two-Factor Authentication': 'Autenticación de dos factores',
  'Enter the 6-digit code from your authenticator app':
    'Ingrese el código de 6 dígitos de su aplicación de autenticación',
  'Token must be 6 digits': 'El código debe tener 6 dígitos',
  'Invalid verification code': 'Código de verificación no válido',
  'Verification Code': 'Código de verificación',
  'Verifying...': 'Verificando...',
  Verify: 'Verificar',
  'Back to Login': 'Volver al inicio de sesión',

  // Sign-up
  'Create your store': 'Cree su tienda',
  'You become the owner. A branch, a register and Cash/Card payments are set up for you.':
    'Usted será el propietario. Se configurarán una sucursal, una caja y los pagos en Efectivo/Tarjeta.',
  'Sign-up is not available on this server. Ask your administrator for an account.':
    'El registro no está disponible en este servidor. Solicite una cuenta a su administrador.',
  'Back to sign in': 'Volver al inicio de sesión',
  'Store name': 'Nombre de la tienda',
  'Enter your store name': 'Ingrese el nombre de su tienda',
  'At least 8 characters': 'Al menos 8 caracteres',
  'Use a 3-letter currency code, e.g. USD': 'Use un código de moneda de 3 letras, p. ej. USD',
  'Already have an account? Use its email and current password to add this store to it.':
    '¿Ya tiene una cuenta? Use su correo electrónico y su contraseña actual para agregarle esta tienda.',
  'Could not create the store': 'No se pudo crear la tienda',
  'Creating store...': 'Creando la tienda...',
  'Create store': 'Crear tienda',
  'Already have a store?': '¿Ya tiene una tienda?',

  // Account security
  'Could not start two-factor setup': 'No se pudo iniciar la configuración de la autenticación de dos factores',
  'Two-factor authentication is on. You will be asked for a code each time you sign in.':
    'La autenticación de dos factores está activada. Se le pedirá un código cada vez que inicie sesión.',
  'That code is not valid. Check the time on your phone and try again.':
    'Ese código no es válido. Verifique la hora de su teléfono e inténtelo de nuevo.',
  'Two-factor authentication is off.': 'La autenticación de dos factores está desactivada.',
  'That code is not valid': 'Ese código no es válido',
  'Two-factor authentication is required': 'La autenticación de dos factores es obligatoria',
  'Your store requires two-factor authentication for staff who manage users, roles, settings or the audit log. Turn it on below to continue.':
    'Su tienda exige la autenticación de dos factores para el personal que administra usuarios, roles, configuración o el registro de auditoría. Actívela a continuación para continuar.',
  'Two-factor authentication': 'Autenticación de dos factores',
  'Protect {account} with a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, ...).':
    'Proteja {account} con un código de 6 dígitos de una aplicación de autenticación (Google Authenticator, Microsoft Authenticator, 1Password, ...).',
  'your account': 'su cuenta',
  'Turn off': 'Desactivar',
  'Starting...': 'Iniciando...',
  'Turn on': 'Activar',
  'Open your authenticator app and scan this QR code.':
    'Abra su aplicación de autenticación y escanee este código QR.',
  'Enter the 6-digit code the app shows to finish.':
    'Ingrese el código de 6 dígitos que muestra la aplicación para terminar.',
  'QR code for your authenticator app': 'Código QR para su aplicación de autenticación',
  "Can't scan? Enter this key manually:": '¿No puede escanear? Ingrese esta clave manualmente:',
  'Verification code': 'Código de verificación',
  'Verify and turn on': 'Verificar y activar',
  'Enter a current code from your authenticator app to turn two-factor off.':
    'Ingrese un código actual de su aplicación de autenticación para desactivar la autenticación de dos factores.',
  'Turning off...': 'Desactivando...',
  Stores: 'Tiendas',
  'Your account belongs to several stores. Choose the one to work in.':
    'Su cuenta pertenece a varias tiendas. Elija en cuál desea trabajar.',
  'Could not switch store': 'No se pudo cambiar de tienda',
  "Where you're signed in": 'Dónde tiene la sesión iniciada',
  "Sign out anything you don't recognise. Sessions also end on their own when they expire.":
    'Cierre cualquier sesión que no reconozca. Las sesiones también terminan solas cuando vencen.',
  'Could not load your sessions': 'No se pudieron cargar sus sesiones',
  'Could not sign out': 'No se pudo cerrar la sesión',
  'This device': 'Este dispositivo',
  'Signed in {created} · last active {lastSeen}': 'Sesión iniciada el {created} · última actividad el {lastSeen}',
  'Sign out of this device': 'Cerrar sesión en este dispositivo',
  'Sign out this session': 'Cerrar esta sesión',
  'No active sessions.': 'No hay sesiones activas.',
  'Signing out...': 'Cerrando sesión...',
  'Sign out everywhere else ({count})': 'Cerrar sesión en todos los demás lugares ({count})',
  'Unknown device': 'Dispositivo desconocido',
  'API client': 'Cliente API',
  Browser: 'Navegador',
  '{browser} on {os}': '{browser} en {os}',

  // Manager approval
  'Manager approval needed': 'Se requiere la aprobación de un gerente',
  "You don't have permission to:": 'No tiene permiso para:',
  'A manager can approve this once by entering their own credentials.':
    'Un gerente puede aprobar esta acción una vez ingresando sus propias credenciales.',
  'Manager email': 'Correo electrónico del gerente',
  'Two-factor code': 'Código de dos factores',
  'Only if the manager has two-factor authentication on':
    'Solo si el gerente tiene activada la autenticación de dos factores',
  'Approval failed': 'La aprobación falló',
  'Checking...': 'Verificando...',
  Approve: 'Aprobar',

  // Offline selling
  'Offline selling is paused': 'La venta sin conexión está en pausa',
  'An administrator revoked this till, so it cannot sell without a connection.':
    'Un administrador revocó esta caja, por lo que no puede vender sin conexión.',
  'This till has not been registered for offline selling yet.':
    'Esta caja aún no ha sido registrada para vender sin conexión.',
  'This till was allowed to sell offline until {date}. That time has passed.':
    'Esta caja estaba autorizada para vender sin conexión hasta el {date}. Ese plazo ya venció.',
  'This till has no offline permission yet.': 'Esta caja aún no tiene permiso para vender sin conexión.',
  'Reconnect to the internet to continue selling. Sales already rung up are safe on this device and upload automatically.':
    'Vuelva a conectarse a internet para seguir vendiendo. Las ventas ya registradas están guardadas en este dispositivo y se enviarán automáticamente.',
  'Waiting for a connection…': 'Esperando conexión…',
  'This till was revoked by an administrator: it cannot sell offline. Ask a manager to restore it under Admin → Devices.':
    'Un administrador revocó esta caja: no puede vender sin conexión. Pida a un gerente que la restablezca en Administración → Dispositivos.',
  'Offline: you can keep selling until {date}. Reconnect before then.':
    'Sin conexión: puede seguir vendiendo hasta el {date}. Vuelva a conectarse antes de esa fecha.',
  'This till has not been registered yet. Connect to the internet once to enable offline selling.':
    'Esta caja aún no ha sido registrada. Conéctese a internet una vez para habilitar la venta sin conexión.',
  'This till was revoked by an administrator and cannot sell offline.':
    'Un administrador revocó esta caja y no puede vender sin conexión.',
  'Offline selling has expired on this till. Reconnect to the internet to continue selling.':
    'La venta sin conexión venció en esta caja. Vuelva a conectarse a internet para seguir vendiendo.',
  'The server rejected this sale': 'El servidor rechazó esta venta',

  // Estimates
  'No customer': 'Sin cliente',

  // Cash movements (MOVEMENT_LABELS)
  'Opening float': 'Fondo inicial',
  'Paid in': 'Entrada de efectivo',
  'Paid out': 'Salida de efectivo',
  'Safe drop': 'Depósito en caja fuerte',
  'Expense payout': 'Pago de gasto',
  'Cash refund': 'Reembolso en efectivo',

  // Expense payment methods (PAYMENT_METHOD_LABELS)
  Cash: 'Efectivo',
  Card: 'Tarjeta',
  'Bank transfer': 'Transferencia bancaria',
  Other: 'Otro',

  // Customer merge fields (MERGE_FIELDS)
  Type: 'Tipo',
  Company: 'Empresa',
  Phone: 'Teléfono',
  'Tax number': 'Número de identificación fiscal',
  'Date of birth': 'Fecha de nacimiento',
  Group: 'Grupo',
  'Credit limit': 'Límite de crédito',
};
