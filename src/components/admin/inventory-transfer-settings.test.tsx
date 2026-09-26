import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDEMPOTENCY_KEY_HEADER, withIdempotencyKey } from '@/lib/api/client';
import { TransferSettingsDialog } from './inventory-transfer-settings';

const api = vi.hoisted(() => ({ updateSettings: vi.fn() }));

vi.mock('@/lib/api/inventory', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/inventory')>()),
  transfersApi: api,
}));
vi.mock('@/hooks/use-store-settings', () => ({
  useStoreSettings: () => ({ data: { transferApprovalMode: 'never', transferOverReceiptTolerancePercent: 0 } }),
  useCurrency: () => 'USD',
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('withIdempotencyKey', () => {
  it('adds the Idempotency-Key header over the other headers', () => {
    expect(withIdempotencyKey('k1', { 'X-Approval-Token': 'a' })).toEqual({
      'X-Approval-Token': 'a',
      [IDEMPOTENCY_KEY_HEADER]: 'k1',
    });
  });

  it('leaves the headers as they are without a key', () => {
    expect(withIdempotencyKey(undefined)).toBeUndefined();
    expect(withIdempotencyKey('', { a: 'b' })).toEqual({ a: 'b' });
  });
});

describe('TransferSettingsDialog idempotency', () => {
  beforeEach(() => api.updateSettings.mockReset());

  it('sends the same Idempotency-Key when a failed save is retried', async () => {
    api.updateSettings.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({});
    const onClose = vi.fn();
    render(<TransferSettingsDialog onClose={onClose} />, { wrapper });

    const save = screen.getByRole('button', { name: 'Save changes' });
    await userEvent.click(save);
    await waitFor(() => expect(api.updateSettings).toHaveBeenCalledTimes(1));
    await userEvent.click(save);
    await waitFor(() => expect(onClose).toHaveBeenCalled());

    expect(api.updateSettings).toHaveBeenCalledTimes(2);
    const [first, second] = api.updateSettings.mock.calls.map((call) => call[1] as string);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).toBe(first);
  });

  it('uses a new key each time the dialog opens', async () => {
    api.updateSettings.mockResolvedValue({});
    for (let i = 0; i < 2; i++) {
      const { unmount } = render(<TransferSettingsDialog onClose={vi.fn()} />, { wrapper });
      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      await waitFor(() => expect(api.updateSettings).toHaveBeenCalledTimes(i + 1));
      unmount();
    }
    const [first, second] = api.updateSettings.mock.calls.map((call) => call[1] as string);
    expect(second).not.toBe(first);
  });
});
