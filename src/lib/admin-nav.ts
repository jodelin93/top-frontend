import {
  BarChart3,
  BookOpen,
  Boxes,
  ClipboardList,
  FileBarChart,
  FileText,
  FileUp,
  FolderTree,
  KeyRound,
  Monitor,
  Package,
  Percent,
  Printer,
  Receipt,
  RotateCcw,
  ScrollText,
  ShieldAlert,
  Settings,
  Tags,
  Truck,
  UserCog,
  Users,
  Wallet,
  Landmark,
  Activity,
  IdCard,
} from 'lucide-react';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: typeof Package;
  // Shown when the user has any of these permissions
  permissions: string[];
}

export const adminNav: { section: string; items: AdminNavItem[] }[] = [
  {
    section: 'Sales',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: BarChart3, permissions: ['reports.view'] },
      { href: '/admin/reports', label: 'Reports', icon: FileBarChart, permissions: ['reports.view'] },
      { href: '/admin/sales', label: 'Sales', icon: Receipt, permissions: ['sales.view'] },
      { href: '/admin/estimates', label: 'Estimates', icon: FileText, permissions: ['estimates.manage'] },
      { href: '/admin/returns', label: 'Returns', icon: RotateCcw, permissions: ['sales.refund'] },
      { href: '/admin/shifts', label: 'Shifts & cash', icon: Wallet, permissions: ['shifts.manage', 'shifts.operate'] },
      { href: '/admin/expenses', label: 'Expenses', icon: Landmark, permissions: ['expenses.create', 'expenses.approve'] },
      { href: '/admin/payments', label: 'Card settlements', icon: ClipboardList, permissions: ['payments.reconcile'] },
      { href: '/admin/review', label: 'Review queue', icon: ShieldAlert, permissions: ['sales.review', 'inventory.adjust', 'shifts.manage'] },
    ],
  },
  {
    section: 'Catalog',
    items: [
      { href: '/admin/products', label: 'Products', icon: Package, permissions: ['catalog.manage'] },
      { href: '/admin/categories', label: 'Categories', icon: FolderTree, permissions: ['catalog.manage'] },
      { href: '/admin/import', label: 'Import', icon: FileUp, permissions: ['catalog.import'] },
      { href: '/admin/price-lists', label: 'Price lists & tax', icon: Tags, permissions: ['pricing.manage'] },
      { href: '/admin/discounts', label: 'Discounts', icon: Percent, permissions: ['discounts.manage'] },
    ],
  },
  {
    section: 'Stock',
    items: [
      { href: '/admin/inventory', label: 'Inventory', icon: Boxes, permissions: ['inventory.receive', 'inventory.adjust', 'inventory.count', 'inventory.transfer'] },
      { href: '/admin/purchasing', label: 'Purchasing', icon: Truck, permissions: ['purchasing.manage', 'purchasing.approve'] },
    ],
  },
  {
    section: 'People',
    items: [
      { href: '/admin/customers', label: 'Customers', icon: Users, permissions: ['customers.manage', 'customers.merge'] },
      { href: '/admin/customers/accounts', label: 'Customer accounts', icon: BookOpen, permissions: ['customers.finance.view'] },
      { href: '/admin/employees', label: 'Employees', icon: IdCard, permissions: ['employees.manage'] },
      { href: '/admin/users', label: 'Users', icon: UserCog, permissions: ['users.manage'] },
      { href: '/admin/roles', label: 'Roles & permissions', icon: KeyRound, permissions: ['roles.manage', 'users.manage'] },
    ],
  },
  {
    section: 'System',
    items: [
      { href: '/admin/settings', label: 'Settings', icon: Settings, permissions: ['settings.manage'] },
      { href: '/admin/devices', label: 'Devices', icon: Monitor, permissions: ['devices.manage'] },
      { href: '/admin/hardware', label: 'Hardware', icon: Printer, permissions: ['hardware.manage'] },
      { href: '/admin/audit', label: 'Audit log', icon: ScrollText, permissions: ['audit.view'] },
      { href: '/admin/system-events', label: 'System events', icon: Activity, permissions: ['platform.operate', 'settings.manage'] },
    ],
  },
];
