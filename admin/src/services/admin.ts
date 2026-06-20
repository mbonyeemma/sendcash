import { api } from "@/lib/api";

// --- Auth ---
export interface AdminProfile {
  id: number | string;
  username: string;
  email: string;
  full_name?: string;
}
export const login = (email: string, password: string) =>
  api.post<{ token: string; admin: AdminProfile }>("/admin/login", { email, password });

// --- Analytics ---
export interface Overview {
  users: { total: number; new_30d: number };
  transactions: { total: number; completed: number; pending: number };
  volume: { total: number };
  profit: { total: number; last_30d: number; today: number };
  wallets: { total: number };
}
export const getOverview = () => api.get<Overview>("/admin/analytics/overview");

export interface ProfitReport {
  totals: { gross_profit?: number; provider_cost?: number; net_profit?: number; volume?: number };
  by_type: Array<{ trans_type: string; count: number; volume: number; profit: number; provider_cost: number }>;
  by_currency: Array<{ currency: string; profit: number; volume: number }>;
}
export const getProfit = (params?: { from_date?: string; to_date?: string }) =>
  api.get<ProfitReport>("/admin/analytics/profit", params);

export interface Timeseries {
  days: number;
  signups: Array<{ day: string; count: number }>;
  transactions: Array<{ day: string; count: number; volume: number; profit: number }>;
}
export const getTimeseries = (days = 30) => api.get<Timeseries>("/admin/analytics/timeseries", { days });

// --- Balances ---
export interface RelworxBalances {
  account: string;
  balances: Array<{ currency: string; status: number; balance?: any; raw?: any; error?: string }>;
}
export const getRelworxBalance = () => api.get<RelworxBalances>("/admin/balances/relworx");

export interface TreasuryBalance {
  label: string;
  address: string;
  purpose: string;
  network: string;
  xrp: number | null;
  rlusd: number | null;
  tokens: Record<string, number>;
  activated: boolean;
  error?: string;
}
export const getTreasuryBalances = () => api.get<TreasuryBalance[]>("/admin/balances/treasury");

// --- Transactions ---
export interface Transaction {
  id: number;
  trans_id: string;
  user_id: string;
  cr_wallet_id: string;
  trans_type: string;
  status: string;
  currency: string;
  amount: number;
  asset?: string;
  fee?: number;
  provider_fee?: number;
  chain?: string;
  narration?: string;
  created_on: string;
  sender?: { username?: string; full_name?: string } | null;
  receiver?: { username?: string; full_name?: string } | null;
}
export const getTransactions = (params?: Record<string, any>) =>
  api.get<Transaction[]>("/admin/reports/transactions", params);

// --- Users ---
export interface User {
  user_id: string;
  full_name?: string;
  username: string;
  email: string;
  country_code?: string;
  currency?: string;
  phone_number?: string;
  is_merchant?: number;
  created_at?: string;
}
export const getUsers = (params?: Record<string, any>) => api.get<User[]>("/admin/users", params);
export const getUserBalances = (id: string) => api.get<any[]>(`/admin/user/${id}/balances`);
export const resetUserPassword = (id: string) => api.put(`/admin/user/${id}/reset-password`, {});
export const deleteUser = (id: string) => api.del(`/admin/user/${id}`);

// --- System users (admins) ---
export interface SystemUser {
  id: number | string;
  username: string;
  email: string;
  full_name?: string;
  created_at?: string;
}
export const getSystemUsers = () => api.get<SystemUser[]>("/admin/system-users");
export const createSystemUser = (body: { username: string; email: string; full_name?: string; password?: string }) =>
  api.post("/admin/system-user", body);
export const deleteSystemUser = (id: string) => api.del(`/admin/system-user/${id}`);
export const resetSystemUserPassword = (id: string) => api.put(`/admin/system-user/${id}/reset-password`, {});

// --- Exchange rates ---
export const getExchangeRates = () => api.get<any[]>("/admin/exchange-rates");

// --- Payment types ---
export interface PaymentType {
  id: number | string;
  type: string;
  country: string;
  currency: string;
  operation: string;
  fee: number;
  fee_type: "FLAT" | "PERCENTAGE";
  min_amount: number;
  max_amount: number;
  status: "active" | "inactive";
}
export const getPaymentTypes = () => api.get<PaymentType[]>("/admin/payment-types");
export const createPaymentType = (body: Partial<PaymentType>) => api.post("/admin/payment-type", body);
export const updatePaymentType = (id: string, body: Partial<PaymentType>) => api.put(`/admin/payment-type/${id}`, body);
export const deletePaymentType = (id: string) => api.del(`/admin/payment-type/${id}`);

// --- Settings ---
export const changePassword = (newPassword: string) => api.put("/admin/change-password", { newPassword });
export const getSweepSettings = () => api.get<any>("/admin/sweep-settings");
export const getCryptoDepositAddresses = (params?: Record<string, any>) =>
  api.get<any[]>("/admin/reports/crypto-addresses", params);
