import apiClient from './client';

export interface LoyaltyRules {
  enabled: boolean;
  earnPercent: number;
  pointValue: number;
  minRedeemPoints: number;
  maxRedeemPercent: number;
}

export interface LoyaltyTransaction {
  id: string;
  createdAt: string;
  type: 'earn' | 'redeem' | 'reversal' | 'adjustment';
  points: number;
  balanceAfter: number;
  amount: number | null;
  saleId: string | null;
  returnId: string | null;
  note: string | null;
}

// Same rules as top-backend/src/loyalty/loyalty-math.ts
export const loyaltyMath = {
  earned: (rules: LoyaltyRules, amount: number) =>
    !rules.enabled || amount <= 0 || rules.pointValue <= 0
      ? 0
      : Math.floor((amount * rules.earnPercent) / 100 / rules.pointValue + 1e-9),
  pointsFor: (rules: LoyaltyRules, amount: number) => Math.ceil(amount / rules.pointValue - 1e-9),
  valueOf: (rules: LoyaltyRules, points: number) => Math.floor(points * rules.pointValue * 100 + 1e-9) / 100,
};

export const loyaltyApi = {
  balance: async (customerId: string): Promise<{ points: number; value: number; rules: LoyaltyRules }> => {
    const { data } = await apiClient.get(`/loyalty/customers/${customerId}`);
    return data;
  },
  history: async (customerId: string): Promise<LoyaltyTransaction[]> => {
    const { data } = await apiClient.get(`/loyalty/customers/${customerId}/history`);
    return data;
  },
  // headers: X-Approval-Token from a manager (without customers.credit.manage)
  adjust: async (customerId: string, points: number, note: string, headers?: Record<string, string>) => {
    const { data } = await apiClient.post(`/loyalty/customers/${customerId}/adjust`, { points, note }, { headers });
    return data;
  },
};
