// Spanish translations: documents-hardware. Keys are the exact English texts passed to t().
export const documentsHardware: Record<string, string> = {
  // ---- Admin navigation ----
  Hardware: 'Hardware',
  // ---- Receipt printing ----
  'Print again as a copy': 'Reimprimir como copia',
  'Try printing again': 'Intentar imprimir de nuevo',
  'The printer did not confirm this receipt. Check the paper before printing again.':
    'La impresora no confirmó este recibo. Revise el papel antes de volver a imprimir.',
  'Could not print the receipt': 'No se pudo imprimir el recibo',
  'Could not print': 'No se pudo imprimir',
  'A4 invoice': 'Factura A4',
  'US Letter invoice': 'Factura tamaño Carta (EE. UU.)',
  'Test receipt': 'Recibo de prueba',
  'Paper width': 'Ancho del papel',
  'Bold text': 'Texto en negrita',
  // ---- Print history ----
  'Print history ({count})': 'Historial de impresión ({count})',
  'Copy #{number}': 'Copia n.º {number}',
  Original: 'Original',
  'Receipt printer': 'Impresora de recibos',
  'Print dialog': 'Cuadro de impresión',
  'E-mailed to {to}': 'Enviado por correo a {to}',
  'Shared link': 'Enlace compartido',
  'valid until {date}': 'válido hasta el {date}',
  Queued: 'En cola',
  'Sent to printer': 'Enviado a la impresora',
  Printed: 'Impreso',
  Failed: 'Falló',
  'Not confirmed': 'No confirmado',
  Sent: 'Enviado',
  Withdrawn: 'Retirado',
  // ---- E-mail / share ----
  'Email receipt': 'Enviar recibo por correo',
  'Receipt link (SMS, WhatsApp)': 'Enlace del recibo (SMS, WhatsApp)',
  'E-mail is not set up for this store.':
    'El correo electrónico no está configurado para esta tienda.',
  'customer@example.com': 'cliente@ejemplo.com',
  'Customer e-mail': 'Correo del cliente',
  'The customer asked to receive this receipt by e-mail (no marketing)':
    'El cliente pidió recibir este recibo por correo (sin publicidad)',
  'Receipt sent to {to}': 'Recibo enviado a {to}',
  'Could not e-mail the receipt': 'No se pudo enviar el recibo por correo',
  'Sending...': 'Enviando...',
  Send: 'Enviar',
  'Could not copy. Select the link and copy it.':
    'No se pudo copiar. Seleccione el enlace y cópielo.',
  'Receipt {number}': 'Recibo {number}',
  'Creates a read-only link to this receipt, valid 30 days, to send from your phone by SMS or WhatsApp.':
    'Crea un enlace de solo lectura a este recibo, válido por 30 días, para enviarlo desde su teléfono por SMS o WhatsApp.',
  'Could not create the link': 'No se pudo crear el enlace',
  'Creating...': 'Creando...',
  'Create link': 'Crear enlace',
  'Receipt link': 'Enlace del recibo',
  'Valid until {date}': 'Válido hasta el {date}',
  Copied: 'Copiado',
  'Copy link': 'Copiar enlace',
  Share: 'Compartir',
  // ---- Credit notes, pro forma ----
  'Credit note': 'Nota de crédito',
  'Refers to invoice {number} of {date}': 'Se refiere a la factura {number} del {date}',
  'Credited to': 'A favor de',
  'CREDIT TOTAL': 'TOTAL DE LA NOTA DE CRÉDITO',
  'Print credit note': 'Imprimir nota de crédito',
  'Print pro forma': 'Imprimir proforma',
  'Pro forma invoice': 'Factura proforma',
  'Pro forma invoice: not a tax invoice. Prices are valid until {date} and subject to stock availability.':
    'Factura proforma: no es una factura fiscal. Precios válidos hasta el {date}, sujetos a disponibilidad de existencias.',
  // ---- Customer display ----
  'Welcome!': '¡Bienvenido!',
  'Thank you!': '¡Gracias!',
  'Change: {amount}': 'Cambio: {amount}',
  // ---- Hardware page ----
  'You need the “Pair the print bridge, test receipt printers and cash drawers” permission to see this page.':
    'Necesita el permiso “Vincular el puente de impresión, probar impresoras de recibos y cajones de dinero” para ver esta página.',
  'Receipt printer, cash drawer, scanner and customer display of this till. These settings are kept in this browser.':
    'Impresora de recibos, cajón de dinero, escáner y pantalla del cliente de esta caja. Esta configuración se guarda en este navegador.',
  'Customer display': 'Pantalla del cliente',
  'Open it in a second window on this PC and move it to the screen facing the customer. It shows the cart and the total as you sell.':
    'Ábrala en una segunda ventana en esta PC y muévala a la pantalla que mira al cliente. Muestra el carrito y el total mientras vende.',
  'Open customer display': 'Abrir pantalla del cliente',
  'Supported devices': 'Dispositivos compatibles',
  Supported: 'Compatible',
  'Not supported': 'No compatible',
  'All tills': 'Todas las cajas',
  'Could not load the tills': 'No se pudieron cargar las cajas',
  'Print bridge': 'Puente de impresión',
  Printers: 'Impresoras',
  'Last report': 'Último reporte',
  'No till has reported its hardware yet.': 'Ninguna caja ha reportado su hardware todavía.',
  Connected: 'Conectado',
  'Not reachable': 'No disponible',
  'Not paired': 'No vinculado',
  online: 'en línea',
  offline: 'sin conexión',
  'paper out': 'sin papel',
  'paper low': 'poco papel',
  'paper OK': 'papel OK',
  'Receipt printer (ESC/POS)': 'Impresora de recibos (ESC/POS)',
  'Cash drawer': 'Cajón de dinero',
  'Barcode scanner': 'Lector de códigos de barras',
  'USB printer': 'Impresora USB',
  Scale: 'Balanza',
  'Fiscal printer': 'Impresora fiscal',
  'Card terminal': 'Terminal de tarjetas',
  'The print bridge is not running on this PC.':
    'El puente de impresión no se está ejecutando en esta PC.',
  'Wrong pairing code. Check the code shown by the print bridge.':
    'Código de vinculación incorrecto. Revise el código que muestra el puente de impresión.',
  'The print bridge is already paired. Restart it with --pair to pair again.':
    'El puente de impresión ya está vinculado. Reinícielo con --pair para vincularlo de nuevo.',
  'The print bridge is paired with another POS or browser. Pair it again.':
    'El puente de impresión está vinculado a otra caja o navegador. Vincúlelo de nuevo.',
  'Print bridge error: {error}': 'Error del puente de impresión: {error}',
  'Paired. Receipts from this browser now print on the receipt printer.':
    'Vinculado. Los recibos de este navegador ahora se imprimen en la impresora de recibos.',
  'Test receipt printed.': 'Recibo de prueba impreso.',
  'The printer did not print: {error}': 'La impresora no imprimió: {error}',
  'Receipt printer (print bridge)': 'Impresora de recibos (puente de impresión)',
  'The print bridge is a small program installed on this PC (see print-bridge/README.md). Without it, receipts open the browser print dialog.':
    'El puente de impresión es un pequeño programa instalado en esta PC (vea print-bridge/README.md). Sin él, los recibos abren el cuadro de impresión del navegador.',
  'Not running': 'Detenido',
  'Paired · version {version}': 'Vinculado · versión {version}',
  'Running, not paired with this browser': 'En ejecución, no vinculado a este navegador',
  'Pairing code': 'Código de vinculación',
  'Shown in the print bridge window': 'Se muestra en la ventana del puente de impresión',
  'Bridge address': 'Dirección del puente',
  Pair: 'Vincular',
  'No printer set up in the print bridge.':
    'No hay ninguna impresora configurada en el puente de impresión.',
  'Print a test receipt': 'Imprimir un recibo de prueba',
  'Unpair this browser from the print bridge?':
    '¿Desvincular este navegador del puente de impresión?',
  Unpair: 'Desvincular',
  'Open the cash drawer now? Make sure nobody is standing in front of it.':
    '¿Abrir el cajón de dinero ahora? Asegúrese de que nadie esté parado frente a él.',
  'Drawer pulse sent.': 'Pulso de apertura enviado.',
  'Pair the print bridge first: the drawer opens through the receipt printer.':
    'Primero vincule el puente de impresión: el cajón se abre a través de la impresora de recibos.',
  'No answer from the printer. Check the drawer before trying again.':
    'La impresora no respondió. Revise el cajón antes de intentarlo de nuevo.',
  'The drawer did not open: {error}': 'El cajón no se abrió: {error}',
  'The drawer is plugged into the receipt printer. Each opening is a single command: it is never repeated automatically.':
    'El cajón está conectado a la impresora de recibos. Cada apertura es un solo comando: nunca se repite automáticamente.',
  'Test drawer kick': 'Probar apertura del cajón',
  'Scanners type the code much faster than a person. These settings tell a scan from typing on this till.':
    'Los escáneres escriben el código mucho más rápido que una persona. Esta configuración distingue un escaneo de lo que se teclea en esta caja.',
  'Ends with': 'Termina con',
  Enter: 'Enter',
  Tab: 'Tabulador',
  'Nothing (end of burst)': 'Nada (fin de la ráfaga)',
  'Minimum characters': 'Mínimo de caracteres',
  'Max delay between keys (ms)': 'Retraso máx. entre teclas (ms)',
  'Ignore repeat scans within (ms)': 'Ignorar escaneos repetidos durante (ms)',
  'Save scanner settings': 'Guardar configuración del escáner',
  'Saved for this till.': 'Guardado para esta caja.',
  'Scanner test': 'Prueba del escáner',
  'Scan a barcode here, or type to compare.':
    'Escanee un código de barras aquí, o escriba para comparar.',
  '{count} keys so far': '{count} teclas hasta ahora',
  Scanner: 'Escáner',
  Typed: 'Tecleado',
  'Average {avg} ms, slowest {max} ms between keys':
    'Promedio {avg} ms, máximo {max} ms entre teclas',
};
