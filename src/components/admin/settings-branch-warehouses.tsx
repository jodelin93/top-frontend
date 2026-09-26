'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { ErrorMessage } from '@/components/admin/page-header';
import { SettingsSection } from '@/components/admin/settings-shared';
import { getErrorMessage } from '@/lib/api/client';
import { branchesApi, branchWarehousesApi, warehousesApi } from '@/lib/api/settings';
import { hasAllBranches, useAuthStore } from '@/stores/auth-store';
import { t } from '@/i18n';

/**
 * Which warehouses serve each branch. Staff limited to some branches see and move
 * the stock of these warehouses only (a till's warehouse is added automatically).
 * Only users with access to every branch can change it.
 */
export function SettingsBranchWarehouses() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canEdit = hasAllBranches(user);
  // Unsaved choices per branch (the saved ones come from the server)
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);

  const { data: branches = [], isLoading } = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.list() });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: () => warehousesApi.list() });
  const { data: assignments = [], error: loadError } = useQuery({
    queryKey: ['branch-warehouses'],
    queryFn: branchWarehousesApi.list,
  });

  const saved = (branchId: string) =>
    assignments.filter((a) => a.branchId === branchId).map((a) => a.warehouseId);
  const current = (branchId: string) => drafts[branchId] ?? saved(branchId);
  const changed = (branchId: string) => {
    const draft = drafts[branchId];
    if (!draft) return false;
    const before = saved(branchId);
    return draft.length !== before.length || draft.some((id) => !before.includes(id));
  };

  const toggle = (branchId: string, warehouseId: string, checked: boolean) =>
    setDrafts((all) => {
      const ids = all[branchId] ?? saved(branchId);
      return {
        ...all,
        [branchId]: checked ? [...new Set([...ids, warehouseId])] : ids.filter((id) => id !== warehouseId),
      };
    });

  const save = useMutation({
    mutationFn: (branchId: string) => branchWarehousesApi.set(branchId, current(branchId)),
    onSuccess: async (_result, branchId) => {
      await queryClient.invalidateQueries({ queryKey: ['branch-warehouses'] });
      setDrafts((all) => Object.fromEntries(Object.entries(all).filter(([id]) => id !== branchId)));
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not save branch warehouses')),
  });

  return (
    <SettingsSection
      title={t('Branch warehouses')}
      description={t(
        'The warehouses each branch works from. Staff limited to some branches only see and move the stock of these warehouses. A register’s stock location adds its warehouse automatically.'
      )}
    >
      <div className="p-4 pb-0 empty:hidden">
        <ErrorMessage>{error ?? (loadError && getErrorMessage(loadError, 'Could not load branch warehouses'))}</ErrorMessage>
        {!canEdit && (
          <p className="text-sm text-gray-500">{t('Only users with access to every branch can change this.')}</p>
        )}
      </div>
      <Table>
        <THead>
          <tr>
            <Th>{t('Branch')}</Th>
            <Th>{t('Warehouses')}</Th>
            <Th />
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={3}>{t('Loading...')}</EmptyRow>
          ) : branches.length === 0 ? (
            <EmptyRow colSpan={3}>{t('No branches yet.')}</EmptyRow>
          ) : (
            branches.map((branch) => (
              <tr key={branch.id} className="align-top hover:bg-gray-50">
                <Td className="font-medium">{branch.name}</Td>
                <Td>
                  {warehouses.length === 0 ? (
                    <span className="text-gray-400">{t('No warehouses yet.')}</span>
                  ) : (
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {warehouses.map((warehouse) => (
                        <label key={warehouse.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            disabled={!canEdit}
                            checked={current(branch.id).includes(warehouse.id)}
                            onChange={(e) => toggle(branch.id, warehouse.id, e.target.checked)}
                          />
                          {warehouse.name}
                        </label>
                      ))}
                    </div>
                  )}
                </Td>
                <Td className="text-right">
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!changed(branch.id) || save.isPending}
                      onClick={() => {
                        setError(null);
                        save.mutate(branch.id);
                      }}
                    >
                      {t('Save')}
                    </Button>
                  )}
                </Td>
              </tr>
            ))
          )}
        </TBody>
      </Table>
    </SettingsSection>
  );
}
