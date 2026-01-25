// =============================================
// Bill Payment System Interfaces
// =============================================

// Base API Response Interface
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  status: number;
}

// Biller Info Interface
export interface BillerInfo extends BasePaymentRequest {
  product_code: string;
  account_number: string;
  validation_reference: string;
}

// Service Category Interface
export interface ServiceCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
  billers_count: number;
}

// Biller Item Interface
export interface BillerItem {
  id: number;
  service_category_id: number;
  name: string;
  slug: string;
  short_name: string;
  description: string;
  logo: string;
  country_code: string;
  currency: string;
  min_amount: number;
  max_amount: number;
  commission_type: 'percentage' | 'fixed';
  commission_rate: number;
  api_endpoint: string;
  api_key_field: string;
  requires_customer_validation: boolean;
  customer_id_label: string;
  customer_id_placeholder: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  category_name?: string;
  category_slug?: string;
  category_icon?: string;
}

// =============================================
// Biller-Specific Payment Interfaces
// =============================================

// Base Payment Interface
export interface BasePaymentRequest {
  amount: number;
  currency?: string;
}

// Electricity Billers
export interface UEGCLPaymentRequest extends BasePaymentRequest {
  meter_number: string;
  amount: number;
}

export interface UmemePaymentRequest extends BasePaymentRequest {
  account_number: string;
  amount: number;
}

// Pay TV Billers
export interface DSTVPaymentRequest extends BasePaymentRequest {
  smart_card_number: string;
  amount: number;
}

export interface GOtvPaymentRequest extends BasePaymentRequest {
  iuc_number: string;
  amount: number;
}

export interface StarTimesPaymentRequest extends BasePaymentRequest {
  smart_card_number: string;
  amount: number;
}

// Airtime Billers
export interface MTNAirtimeRequest extends BasePaymentRequest {
  phone_number: string;
  amount: number;
}

export interface AirtelAirtimeRequest extends BasePaymentRequest {
  phone_number: string;
  amount: number;
}

export interface AfricellAirtimeRequest extends BasePaymentRequest {
  phone_number: string;
  amount: number;
}

export interface UTLAirtimeRequest extends BasePaymentRequest {
  phone_number: string;
  amount: number;
}

// Water Billers
export interface NWSCPaymentRequest extends BasePaymentRequest {
  account_number: string;
  amount: number;
}

export interface KampalaWaterPaymentRequest extends BasePaymentRequest {
  customer_number: string;
  amount: number;
}

// Data/Internet Billers
export interface MTNDataRequest extends BasePaymentRequest {
  phone_number: string;
  amount: number;
  data_bundle_id?: string;
}

export interface AirtelDataRequest extends BasePaymentRequest {
  phone_number: string;
  amount: number;
  data_bundle_id?: string;
}

export interface AfricellDataRequest extends BasePaymentRequest {
  phone_number: string;
  amount: number;
  data_bundle_id?: string;
}

// Fuel Billers
export interface ShellPaymentRequest extends BasePaymentRequest {
  vehicle_number: string;
  amount: number;
}

export interface TotalPaymentRequest extends BasePaymentRequest {
  card_number: string;
  amount: number;
}

export interface PetroPaymentRequest extends BasePaymentRequest {
  station_code: string;
  amount: number;
}

// =============================================
// Union Types for Dynamic Interface Selection
// =============================================

// All possible payment request types
export type BillerPaymentRequest = 
  | UEGCLPaymentRequest
  | UmemePaymentRequest
  | DSTVPaymentRequest
  | GOtvPaymentRequest
  | StarTimesPaymentRequest
  | MTNAirtimeRequest
  | AirtelAirtimeRequest
  | AfricellAirtimeRequest
  | UTLAirtimeRequest
  | NWSCPaymentRequest
  | KampalaWaterPaymentRequest
  | MTNDataRequest
  | AirtelDataRequest
  | AfricellDataRequest
  | ShellPaymentRequest
  | TotalPaymentRequest
  | PetroPaymentRequest;

// =============================================
// Payment Processing Interfaces
// =============================================

// Payment Response Interface
export interface PaymentResponse {
  success: boolean;
  message: string;
  transaction_id?: string;
  reference_number?: string;
  amount: number;
  currency: string;
  fee?: number;
  total_amount?: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  provider_response?: any;
  timestamp: string;
}

// Customer Validation Interface
export interface CustomerValidationResponse {
  valid: boolean;
  customer_name?: string;
  customer_details?: any;
  message: string;
}

// =============================================
// Helper Interface Mapping
// =============================================

// Map biller slugs to their required interfaces
export const BillerInterfaceMap = {
  // Electricity
  'uegcl': 'UEGCLPaymentRequest',
  'umeme': 'UmemePaymentRequest',
  
  // Pay TV
  'dstv': 'DSTVPaymentRequest',
  'gotv': 'GOtvPaymentRequest',
  'startimes': 'StarTimesPaymentRequest',
  
  // Airtime
  'mtn': 'MTNAirtimeRequest',
  'airtel': 'AirtelAirtimeRequest',
  'africell': 'AfricellAirtimeRequest',
  'utl': 'UTLAirtimeRequest',
  
  // Water
  'nwsc': 'NWSCPaymentRequest',
  'kampala-water': 'KampalaWaterPaymentRequest',
  
  // Data
  'mtn-data': 'MTNDataRequest',
  'airtel-data': 'AirtelDataRequest',
  'africell-data': 'AfricellDataRequest',
  
  // Fuel
  'shell': 'ShellPaymentRequest',
  'total': 'TotalPaymentRequest',
  'petro': 'PetroPaymentRequest'
} as const;

// =============================================
// Validation Schemas (for runtime validation)
// =============================================

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'email' | 'phone';
  required: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  message: string;
}

export const BillerValidationRules: Record<string, ValidationRule[]> = {
  'uegcl': [
    {
      field: 'meter_number',
      type: 'string',
      required: true,
      min: 8,
      max: 20,
      message: 'Meter number must be between 8-20 characters'
    },
    {
      field: 'amount',
      type: 'number',
      required: true,
      min: 5000,
      max: 500000,
      message: 'Amount must be between 5,000 and 500,000 UGX'
    }
  ],
  'mtn': [
    {
      field: 'phone_number',
      type: 'phone',
      required: true,
      pattern: '^256[0-9]{9}$',
      message: 'Phone number must be in format 256XXXXXXXXX'
    },
    {
      field: 'amount',
      type: 'number',
      required: true,
      min: 500,
      max: 500000,
      message: 'Amount must be between 500 and 500,000 UGX'
    }
  ],
  'dstv': [
    {
      field: 'smart_card_number',
      type: 'string',
      required: true,
      min: 10,
      max: 15,
      message: 'Smart card number must be between 10-15 characters'
    },
    {
      field: 'amount',
      type: 'number',
      required: true,
      min: 15000,
      max: 200000,
      message: 'Amount must be between 15,000 and 200,000 UGX'
    }
  ]
  // Add more validation rules for other billers as needed
}; 