'use client';

import { Input } from '@/components/ui/input';
import { Field } from '@/components/admin/page-header';
import { CheckboxField, SettingsSection } from '@/components/admin/settings-shared';
import { SaveBar, useSettingsForm } from '@/components/admin/settings-form';
import { loyaltyMath } from '@/lib/api/loyalty';
import { formatMoney } from '@/lib/format';
import { t } from '@/i18n';

const KEYS = [
  'loyaltyEnabled',
  'loyaltyEarnPercent',
  'loyaltyPointValue',
  'loyaltyMinRedeemPoints',
  'loyaltyMaxRedeemPercent',
] as const;

/**
 * Loyalty (fidelity) programme: how customers earn points and what points are worth
 */
export function SettingsLoyalty() {
  const form = useSettingsForm(KEYS);
  if (form.isLoading || !form.settings) return <p className="text-sm text-gray-500">{t('Loading...')}</p>;
  const v = form.values;
  const currency = form.settings.currencyCode;
  const money = (value: number) => formatMoney(value, currency);
  const rules = {
    enabled: v.loyaltyEnabled,
    earnPercent: Number(v.loyaltyEarnPercent) || 0,
    pointValue: Number(v.loyaltyPointValue) || 0.01,
    minRedeemPoints: Number(v.loyaltyMinRedeemPoints) || 0,
    maxRedeemPercent: Number(v.loyaltyMaxRedeemPercent) || 0,
  };
  const exampleSale = 50;
  const earned = loyaltyMath.earned({ ...rules, enabled: true }, exampleSale);
  const number = (value: string) => (value === '' ? 0 : Number(value));

  return (
    <SettingsSection
      title={t('Loyalty points')}
      description={t('Customers linked to a sale earn points they can spend later as a payment at the till.')}
    >
      <div className="space-y-6 p-4">
        <CheckboxField
          label={t('Run a loyalty programme')}
          hint={t("When off, no points are earned and customers can't pay with points (existing balances are kept)")}
          checked={v.loyaltyEnabled}
          onChange={(e) => form.set('loyaltyEnabled', e.target.checked)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('Points earned (% of each sale)')}
            htmlFor="loyaltyEarnPercent"
            hint={t('e.g. 5 = customers get back 5% of what they pay, as points')}
          >
            <div className="flex items-center gap-2">
              <Input
                id="loyaltyEarnPercent"
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={v.loyaltyEarnPercent}
                disabled={!v.loyaltyEnabled}
                onChange={(e) => form.set('loyaltyEarnPercent', number(e.target.value))}
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </Field>
          <Field
            label={t('Value of one point')}
            htmlFor="loyaltyPointValue"
            hint={t('{points} points = {amount}', { points: Math.round(1 / rules.pointValue), amount: money(1) })}
          >
            <Input
              id="loyaltyPointValue"
              type="number"
              min={0.0001}
              step="0.001"
              value={v.loyaltyPointValue}
              disabled={!v.loyaltyEnabled}
              onChange={(e) => form.set('loyaltyPointValue', number(e.target.value))}
            />
          </Field>
          <Field label={t('Minimum points to spend at once')} htmlFor="loyaltyMinRedeemPoints">
            <Input
              id="loyaltyMinRedeemPoints"
              type="number"
              min={0}
              value={v.loyaltyMinRedeemPoints}
              disabled={!v.loyaltyEnabled}
              onChange={(e) => form.set('loyaltyMinRedeemPoints', Math.round(number(e.target.value)))}
            />
          </Field>
          <Field
            label={t('Max share of a sale paid with points')}
            htmlFor="loyaltyMaxRedeemPercent"
            hint={t('100 = points can pay the whole sale')}
          >
            <div className="flex items-center gap-2">
              <Input
                id="loyaltyMaxRedeemPercent"
                type="number"
                min={0}
                max={100}
                value={v.loyaltyMaxRedeemPercent}
                disabled={!v.loyaltyEnabled}
                onChange={(e) => form.set('loyaltyMaxRedeemPercent', number(e.target.value))}
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </Field>
        </div>

        <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">
          <div className="font-medium">{t('Example')}</div>
          {t(
            'A customer paying {amount} earns {points} points, worth {value} on a later purchase. Spending starts at {minPoints} points ({minValue}). Points are not earned on the part of a sale paid with points, are taken back when items are returned, and restored when a points payment is refunded.',
            {
              amount: money(exampleSale),
              points: earned,
              value: money(loyaltyMath.valueOf(rules, earned)),
              minPoints: rules.minRedeemPoints,
              minValue: money(loyaltyMath.valueOf(rules, rules.minRedeemPoints)),
            }
          )}
        </div>

        <SaveBar form={form} />
      </div>
    </SettingsSection>
  );
}
