import fs from 'node:fs';
import path from 'node:path';

/** What global-setup created for this run, shared with the tests and global-teardown */
export interface RunState {
  run: string;
  slug: string;
  tenantId: string | null;
  userIds: string[];
  email: string;
  password: string;
  token?: string;
  branchId?: string;
  locationId?: string;
  registerId?: string;
  cashMethodId?: string;
}

export const STATE_DIR = path.resolve(__dirname, '../.state');
export const STATE_FILE = path.join(STATE_DIR, 'run.json');
export const STORAGE_STATE = path.join(STATE_DIR, 'owner-storage.json');

export function writeState(state: RunState) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function readState(): RunState {
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as RunState;
}

export function readStateIfAny(): RunState | null {
  try {
    return readState();
  } catch {
    return null;
  }
}
