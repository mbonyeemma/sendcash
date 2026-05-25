import { api, setAuthToken, removeAuthToken, getAuthToken, ApiResponse } from "@/lib/api";

// Types

export interface RegisterRequest {
  full_name: string;
  email: string;
  password: string;
  phone_number?: string;
  country_code?: string;
  confirm_password?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: {
    user_id: string;
    username: string;
    email: string;
    email_verified: number | boolean;
    full_name?: string;
    country_code?: string;
    country?: string;
    currency?: string;
    phone_number?: string;
    has_wallet_pin?: boolean;
  };
  wallet?: {
    user_id: string;
    chain: string;
    publicKey: string;
    secret: string;
    mnemonic: string;
  };
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface VerifyOTPResponse {
  token: string;
  refreshToken?: string;
  user: {
    user_id: string;
    username: string;
    email: string;
    email_verified: boolean;
    full_name?: string;
    country_code?: string;
    country?: string;
    currency?: string;
    phone_number?: string;
    has_wallet_pin?: boolean;
  };
}

export interface BalanceResponse {
  balance: string;
  currency: string;
}

/** Supported fiat currency for onramp/offramp (from API) */
export interface SupportedCurrency {
  id: string;
  symbol: string;
  name: string;
  logo: string;
  rlusd_rate: number;
  usdc_rate?: number;
  usdt_rate?: number;
  fee_percent: number;
}

export interface Transaction {
  id: string;
  type: string;
  amount: string;
  currency: string;
  status: string;
  created_at: string;
  description?: string;
}

export interface StatementResponse {
  transactions: Transaction[];
  total: number;
}

export interface PaymentMethod {
  id: string;
  payment_method_id?: string;
  type: string;
  currency: string;
  phone_number?: string;
  account_name: string;
  account_number?: string;
  bank_name?: string;
  bank_address?: string;
  country_code?: string;
}

export interface TransferRequest {
  account_number: string;
  amount: number;
  payment_method_id?: string;
  pin: string;
  payment_mode: string;
  currency: string;
  billerInfo?: Record<string, any>;
}

export interface DepositRequest {
  amount: string;
  currency: string;
  account_number: string;
  /** Wallet address to receive crypto (XRPL r… or Base 0x…) */
  destination_address?: string;
  /** Crypto amount to receive (optional, for display) */
  amount_rlusd?: number;
  amount_crypto?: number;
  asset?: string;
  chain?: "xrpl" | "base";
}

export interface DepositRequestResponse {
  phone: string;
  reference: string;
  amount_ugx: number;
  amount_rlusd?: number;
  amount_usdc?: number;
  amount_crypto?: number;
  asset?: string;
  chain?: "xrpl" | "base";
}

export interface AddPaymentMethodRequest {
  type: string;
  currency: string;
  phone_number?: string;
  country_code?: string;
  network?: string;
  account_name: string;
  account_number?: string;
  bank_name?: string;
  bank_code?: string;
  /** Optional address (physical or other); sent as bank_address for storage */
  bank_address?: string;
  bank_phone_number?: string;
  bank_country?: string;
}

export interface SetPinRequest {
  pin: string;
  confirm_pin: string;
}

export interface PinLoginRequest {
  pin: string;
}

export interface UpdateProfileRequest {
  full_name?: string;
  avatar?: string;
  country?: string;
  bio?: string;
  phone_number?: string;
}

export interface ValidateAccountRequest {
  payment_method: string;
  receiver_account: string;
  amount: number;
}

// Re-export token management functions
export { setAuthToken, removeAuthToken, getAuthToken };

// Auth APIs
export const authApi = {
  register: async (data: RegisterRequest): Promise<ApiResponse> => {
    return api.post(data, "/user/register");
  },

  verifyOTP: async (data: VerifyOTPRequest): Promise<ApiResponse<VerifyOTPResponse>> => {
    const response = await api.post<VerifyOTPResponse>(data, "/user/verify-otp");
    if (response.data?.token) {
      setAuthToken(response.data.token);
    }
    return response;
  },

  /** Request a new verification code for an email (new signup or existing unverified account) */
  requestVerificationCode: async (email: string): Promise<ApiResponse> => {
    return api.post({ email }, "/user/send-otp");
  },

  login: async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    const response = await api.post<LoginResponse>(data, "/user/login");
    if (response.data?.token) {
      setAuthToken(response.data.token);
    }
    return response;
  },

  pinLogin: async (data: PinLoginRequest): Promise<ApiResponse<LoginResponse>> => {
    const response = await api.post<LoginResponse>(data, "/wallet/pinlogin");
    if (response.data?.token) {
      setAuthToken(response.data.token);
    }
    return response;
  },

  forgotPassword: async (email: string): Promise<ApiResponse> => {
    return api.post({ email }, "/user/forgot-password");
  },

  verifyResetOTP: async (email: string, otp: string): Promise<ApiResponse> => {
    return api.post({ email, otp }, "/user/verify-reset-otp");
  },

  resetPassword: async (email: string, newPassword: string): Promise<ApiResponse> => {
    return api.post({ email, newPassword }, "/user/reset-password");
  },

  logout: (): void => {
    removeAuthToken();
  },
};

// Wallet APIs
export const walletApi = {
  getBalance: async (currency: string = "UGX"): Promise<ApiResponse<BalanceResponse>> => {
    return api.get<BalanceResponse>(`/wallet/balance/${currency}`);
  },

  getStatement: async (): Promise<ApiResponse<StatementResponse>> => {
    return api.get<StatementResponse>("/wallet/accountStatement");
  },

  transfer: async (data: TransferRequest): Promise<ApiResponse> => {
    return api.post(data, "/wallet/transferRequest");
  },

  depositRequest: async (data: DepositRequest): Promise<ApiResponse> => {
    return api.post(data, "/wallet/depositRequest");
  },

  validateAccount: async (data: ValidateAccountRequest): Promise<ApiResponse> => {
    return api.post(data, "/wallet/validatAccount");
  },

  setTransactionPin: async (data: SetPinRequest): Promise<ApiResponse> => {
    return api.post(data, "/wallet/setTransactionPin");
  },

  getDepositAddresses: async (): Promise<ApiResponse> => {
    return api.get("/wallet/deposit/addresses");
  },

  getSupportedAssets: async (): Promise<ApiResponse> => {
    return api.get("/wallet/getSupportedAssets");
  },

  getSupportedCurrencies: async (): Promise<ApiResponse<SupportedCurrency[]>> => {
    return api.get<SupportedCurrency[]>("/wallet/supportedCurrencies");
  },

  stableCoinDeposit: async (amount: number, assetCode: string, chainCode: string): Promise<ApiResponse> => {
    return api.post({ amount, asset_code: assetCode, chain_code: chainCode }, "/wallet/stableCoinDeposit");
  },

  /** Create RLUSD offramp payout request; returns XRPL address + memo for user to send RLUSD in GemWallet */
  createPayoutRequest: async (data: RlusdPayoutRequest): Promise<ApiResponse<RlusdPayoutResponse>> => {
    return api.post<RlusdPayoutResponse>(data, "/wallet/rlusdPayoutRequest");
  },

  /** Get swap rate for an asset pair (e.g. XRP -> RLUSD) */
  getSwapRate: async (fromAsset: string, toAsset: string, amount: number): Promise<ApiResponse<{ fromAsset: string; toAsset: string; amount: number; rate: number }>> => {
    const qs = new URLSearchParams({
      fromAsset,
      toAsset,
      amount: String(amount),
    });
    return api.get<{ fromAsset: string; toAsset: string; amount: number; rate: number }>(`/wallet/swapRate?${qs.toString()}`);
  },

  /** Perform a swap (backend currently returns a mock success response) */
  swap: async (fromAsset: string, toAsset: string, amount: number): Promise<ApiResponse<{ receivedAmount: number; transactionId: string }>> => {
    return api.post<{ receivedAmount: number; transactionId: string }>(
      { fromAsset, toAsset, amount },
      "/wallet/swap"
    );
  },

  /** Record a DEX swap in the database (after successful on-chain swap). */
  recordSwap: async (params: {
    fromAsset: string;
    toAsset: string;
    amountSwapped: number;
    receivedAmount: number;
    txHash?: string;
    walletAddress?: string;
  }): Promise<ApiResponse<{ trans_id: string; hash: string }>> => {
    return api.post<{ trans_id: string; hash: string }>("/wallet/recordSwap", params);
  },
};

export interface RlusdPayoutRequest {
  amount: number;
  fiat_amount: number;
  payment_mode: string;
  /** Payout currency (e.g. UGX, KES, TZS) – used for statement display and conversion */
  currency?: string;
  account_number: string;
  bank_name?: string;
  account_holder_name?: string;
  network?: string;
  payment_method_id?: string;
  narration?: string;
  /** xrpl (default) or base */
  chain?: "xrpl" | "base";
  /** User's Base wallet that will send USDC/USDT (required for base offramp) */
  sender_address?: string;
  /** USDC, USDT, or RLUSD */
  asset?: string;
}

export interface RlusdPayoutResponse {
  chain?: "xrpl" | "base";
  xrpl_destination?: string;
  memo?: string;
  base_custody_address?: string;
  amount: number;
  trans_id: string;
  expires_in_seconds: number;
}

// Provider (onramp) APIs: quote, onramp request, pay-in instructions
export interface OnrampQuoteRequest {
  amount_ugx?: number;
  amount_rlusd?: number;
}

export interface OnrampQuoteResponse {
  amount_ugx: number;
  amount_rlusd: number;
  rate: number;
  fee_ugx: number;
  fee_pct: number;
  expires_in_seconds: number;
}

export interface OnrampRequestRequest {
  amount_ugx: number;
  amount_rlusd: number;
  destination_address: string;
  account_number?: string;
  network?: string;
}

export interface OnrampRequestResponse {
  trans_id: string;
  reference: string;
  pay_in_address?: string;
  amount_ugx: number;
  amount_rlusd: number;
  instructions: string;
  expires_in_seconds: number;
}

export const providerApi = {
  getQuote: async (data: OnrampQuoteRequest): Promise<ApiResponse<OnrampQuoteResponse>> => {
    return api.post<OnrampQuoteResponse>(data, "/provider/quote");
  },
  createOnrampRequest: async (data: OnrampRequestRequest): Promise<ApiResponse<OnrampRequestResponse>> => {
    return api.post<OnrampRequestResponse>(data, "/provider/onrampRequest");
  },
};

// Payment Method APIs
export const paymentMethodApi = {
  addPaymentMethod: async (data: AddPaymentMethodRequest): Promise<ApiResponse<PaymentMethod>> => {
    return api.post<PaymentMethod>(data, "/wallet/addPaymentMethod");
  },

  getUserPaymentMethods: async (type?: string): Promise<ApiResponse<PaymentMethod[]>> => {
    const query = type ? `?type=${type}` : "";
    return api.get<PaymentMethod[]>(`/wallet/getUserPaymentMethods${query}`);
  },

  deletePaymentMethod: async (id: string): Promise<ApiResponse> => {
    return api.get(`/wallet/deletePaymentMethod/${id}`);
  },

  getPaymentTypes: async (): Promise<ApiResponse> => {
    return api.get("/wallet/getPaymentTypes");
  },

  getAdminPaymentTypes: async (): Promise<ApiResponse> => {
    return api.get("/admin/payment-types");
  },
};

// Payment Types API
export interface PaymentType {
  id: number;
  type: string;
  country: string;
  currency: string;
  operation: string; // "ALL", "DEPOSIT", "TRANSFER"
  fee: number;
  fee_type: string; // "FLAT", "PERCENTAGE"
  min_amount: number;
  max_amount: number;
  status: string; // "active", "inactive"
}

export const paymentTypeApi = {
  getPaymentTypes: async (): Promise<ApiResponse<PaymentType[]>> => {
    return api.get<PaymentType[]>("/wallet/getPaymentTypes");
  },
};

// Profile APIs
export const profileApi = {
  updateProfile: async (data: UpdateProfileRequest): Promise<ApiResponse> => {
    return api.post(data, "/user/update_profile");
  },

  getUserByUsername: async (username: string): Promise<ApiResponse> => {
    return api.get(`/user/get_user_by_id/${username}`);
  },

  getCountries: async (): Promise<ApiResponse> => {
    return api.get("/user/getCountries");
  },

  changePin: async (oldPin: string, confirmOldPin: string, newPin: string): Promise<ApiResponse> => {
    return api.post({ oldPin, confirmOldPin, newPin }, "/user/change-pin");
  },
};

// KYC API
export interface KycStepStatus {
  status: 'verified' | 'pending' | 'unverified';
  value?: string | null;
}

export interface KycStatusResponse {
  email: KycStepStatus;
  phone: KycStepStatus;
  id_document: KycStepStatus;
  selfie: KycStepStatus;
}

export const kycApi = {
  getKycStatus: async (): Promise<ApiResponse<KycStatusResponse>> => {
    return api.get<KycStatusResponse>("/user/kyc-status");
  },
};

// Notifications API
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export const notificationApi = {
  getNotifications: async (): Promise<ApiResponse<Notification[]>> => {
    return api.get<Notification[]>("/user/notifications");
  },

  markAsRead: async (notificationIds: string[]): Promise<ApiResponse> => {
    return api.post({ notificationIds }, "/user/notifications/markasread");
  },

  deleteNotifications: async (notificationIds: string[]): Promise<ApiResponse> => {
    return api.post({ notificationIds }, "/user/notifications/delete");
  },

  registerPushToken: async (token: string): Promise<ApiResponse> => {
    return api.post({ token }, "/user/registerPushToken");
  },
};

// Exchange Rate API
export interface ExchangeRateRequest {
  from_currency: string;
  to_currency: string;
}

export interface ExchangeRateResponse {
  rate: number;
  from_currency: string;
  to_currency: string;
}

export const exchangeApi = {
  getExchangeRate: async (fromCurrency: string, toCurrency: string): Promise<ApiResponse<ExchangeRateResponse>> => {
    return api.post<ExchangeRateResponse>(
      { from_currency: fromCurrency, to_currency: toCurrency },
      "/wallet/getExchangeRate"
    );
  },
};
