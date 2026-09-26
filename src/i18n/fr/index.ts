// All French texts, merged. Each area has its own file so they can be edited independently.
import { common } from './common';
import { pos } from './pos';
import { adminCatalog } from './admin-catalog';
import { adminSales } from './admin-sales';
import { adminInventory } from './admin-inventory';
import { adminSettings } from './admin-settings';
import { adminOther } from './admin-other';
import { errors } from './errors';
import { overrides } from './overrides';
import { posAccess } from './pos-access';
import { documentsHardware } from './documents-hardware';
import { serverTexts } from './server-texts';

export const fr: Record<string, string> = {
  // First: existing wordings in the other files win over these
  // Texts written by the server (errors, notifications...): any other wording wins
  ...serverTexts,
  ...documentsHardware,
  ...common,
  ...pos,
  ...adminCatalog,
  ...adminSales,
  ...adminInventory,
  ...adminSettings,
  ...adminOther,
  ...errors,
  ...posAccess,
  // Last: agreed wordings and context variants
  ...overrides,
};
