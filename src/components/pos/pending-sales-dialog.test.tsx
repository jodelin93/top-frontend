import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { describeSyncReason, PendingSalesDialog } from './pending-sales-dialog';

const render = (ui: ReactElement) =>
  rtlRender(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe('PendingSalesDialog', () => {
  it('lists waiting sales with their offline number and maps uploaded ones to the server number', () => {
    render(
      <PendingSalesDialog
        open
        onOpenChange={vi.fn()}
        sales={[
          {
            id: 'aaaabbbb-1111-2222-3333-444455556666',
            input: { registerId: 'r1', items: [], payments: [], offlineNumber: 'OFFLINE-AAAABBBB' },
            createdAt: '2026-09-24T10:00:00.000Z',
            total: 12,
            attempts: 0,
            deviceSequence: 3,
          },
        ]}
        acknowledged={[
          {
            id: 'ccccdddd-1111-2222-3333-444455556666',
            saleId: 's1',
            saleNumber: 'S-000042',
            total: 30,
            createdAt: '2026-09-24T09:00:00.000Z',
            acknowledgedAt: '2026-09-24T09:05:00.000Z',
          },
        ]}
        currency="USD"
        online
        syncing={false}
        onSync={vi.fn()}
      />
    );
    expect(screen.getByText('OFFLINE-AAAABBBB')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('Waiting to upload')).toBeInTheDocument();
    expect(screen.getByText('Uploaded')).toBeInTheDocument();
    expect(screen.getByText('OFFLINE-CCCCDDDD')).toBeInTheDocument();
    expect(screen.getByText('S-000042')).toBeInTheDocument();
  });

  it('shows needs_review sales with a readable reason and offers the export', () => {
    render(
      <PendingSalesDialog
        open
        onOpenChange={vi.fn()}
        sales={[
          {
            id: 'eeeeffff-1111-2222-3333-444455556666',
            input: { registerId: 'r1', items: [], payments: [] },
            createdAt: '2026-09-24T10:00:00.000Z',
            total: 12,
            attempts: 2,
            error: 'payload_hash_mismatch',
          },
          {
            id: 'aaaaffff-1111-2222-3333-444455556666',
            input: { registerId: 'r1', items: [], payments: [] },
            createdAt: '2026-09-24T10:01:00.000Z',
            total: 5,
            attempts: 1,
            nextAttemptAt: '2999-01-01T00:00:00.000Z',
          },
        ]}
        currency="USD"
        online
        syncing={false}
        onSync={vi.fn()}
      />
    );
    expect(screen.getByText('Needs review:')).toBeInTheDocument();
    expect(screen.getByText(/fingerprint does not match/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByText(/Upload postponed/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export unsynced sales/ })).toBeInTheDocument();
  });

  it('describes server reasons', () => {
    expect(describeSyncReason('invalid_payload: items must be an array')).toBe(
      'The sale is incomplete: items must be an array'
    );
    expect(describeSyncReason('Register not found')).toBe('Register not found');
  });
});
