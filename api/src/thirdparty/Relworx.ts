import axios, { AxiosInstance, AxiosError } from 'axios';
import Model from '../libs/modal';


interface emResponse {
  status: number;    // 200 if API response "success" is true, 400 if false
  message: string;   // API's "message" field
  data: any;         // Entire API response data
  internal_reference: string;
}
const businessAccount = process.env.RELWORX_BUSINESS_ACCOUNT || "REL91EBEDF358"

class RelworxMobileMoney {
  private axiosInstance: AxiosInstance;

  constructor() {

    this.axiosInstance = axios.create({
      baseURL: process.env.RELWORX_URL || 'https://payments.relworx.com/api/',
      headers: {
        'Authorization': `Bearer ${process.env.RELWORX_API_KEY}`,
        'Accept': 'application/vnd.relworx.v2',
        'Content-Type': 'application/json',
      },


    });
    console.log(`RelworxMobileMoney initialized with base URL`, {
      'Authorization': `Bearer ${process.env.RELWORX_API_KEY}`,
      'Accept': 'application/vnd.relworx.v2',
      'Content-Type': 'application/json',
    })
  }

  private transformResponseBiller(apiData: any): emResponse {
    console.log(`transformResponse`, apiData)
    const { success, message } = apiData;
    const status = success ? 202 : 400;
    return {
      status,
      message,
      data: apiData,
      internal_reference: apiData.internal_reference || apiData.validation_reference || "",

    };
  }

  private transformResponse(apiData: any): emResponse {
    console.log(`transformResponse`, apiData)
    const { success, message } = apiData;
    const status = success ? 200 : 400;
    return {
      status,
      message,
      data: apiData,
      internal_reference: apiData.internal_reference || apiData.validation_reference || "",

    };
  }

  private generateReference(): string {
    const timestampPart = Date.now().toString().slice(-7); // last 7 digits of timestamp
    const randomPart = Math.random().toString(36).substring(2, 8); // 6 random chars
    return `KT${timestampPart}${randomPart}`; // total: 2 (KT) + 7 + 6 = 15
  }


  /**
   * Handles any Axios errors by checking for an API response.
   *
   * @param error The error thrown by Axios
   */
  private handleError(error: unknown): emResponse {
    if (error && typeof error === 'object' && 'response' in error && (error as any).response) {
      const res = (error as any).response;
      const status = res.status || 500;
      const apiData = res.data;
      let message = 'API returned an error.';
      if (typeof apiData === 'string') {
        message = status === 500 ? 'Mobile money provider is temporarily unavailable.' : message;
      } else if (apiData?.message) {
        message = apiData.message;
      } else if (status === 500) {
        message = 'Mobile money provider is temporarily unavailable.';
      }
      return {
        status,
        message,
        data: apiData,
        internal_reference: "",
      };
    }
    return {
      status: 500,
      message: 'A network or unexpected error occurred.',
      data: null,
      internal_reference: "",
    };
  }



  public async requestPayment(
    accountNo: string,
    reference: string,
    msisdn: string,
    currency: string,
    amount: number,
    description?: string
  ): Promise<emResponse> {
    const payload = {
      account_no: businessAccount,
      reference,
      msisdn,
      currency,
      amount,
      description,
    };

    try {
      const response = await this.axiosInstance.post('/mobile-money/request-payment', payload);
      console.log('requestPayment success:', response.data);
      return this.transformResponse(response.data);
    } catch (error: any) {
      const result = this.handleError(error);
      console.error('requestPayment error:', result.status, result.message);
      return result;
    }
  }


  public async sendPayment(
    accountNo: string,
    reference: string,
    msisdn: string,
    currency: string,
    amount: number,
    description?: string
  ): Promise<emResponse> {


    const payload = {
      account_no: businessAccount,
      reference,
      msisdn: this.normalizePhoneNumber(msisdn, "UG"),
      currency,
      amount: Number(amount),
      description,
    };
    console.log(`sendPaymentInformation`, payload)

    try {
      new Model().logOperation(`MOBILE_MONEY_REQUEST`, reference, businessAccount, "", payload)
      const response = await this.axiosInstance.post('/mobile-money/send-payment', payload);
      console.log('sendPayment success:', response.data);
      try {
        new Model().logOperation(`MOBILE_MONEY_RESPONSE`, reference, "", "", JSON.stringify(response.data))
      } catch (error) {

      }
      if (response.data.success) {
        return {
          status: 202,
          message: response.data.message,
          data: response.data,
          internal_reference: response.data.reference || response.data.validation_reference || "",
        }
      } else {
        return {
          status: 400,
          message: response.data.message,
          data: response.data,
          internal_reference: response.data.reference || response.data.validation_reference || "",
        }
      }
    } catch (error) {
      console.error('sendPayment error:', error);
      return this.handleError(error);
    }
  }


  public async validateNumber(msisdn: string): Promise<emResponse> {
    const payload = { msisdn };

    try {
      const response = await this.axiosInstance.post('/mobile-money/validate', payload);
      console.log('validateNumber success:', response.data);
      return this.transformResponse(response.data);
    } catch (error) {
      console.error('validateNumber error:', error);
      return this.handleError(error);
    }
  }


  public async getWalletBalance(accountNo: string, currency: string): Promise<emResponse> {
    const payload = { account_no: accountNo, currency };

    try {
      const response = await this.axiosInstance.post('/mobile-money/check-balance', payload);
      console.log('getWalletBalance success:', response.data);
      return this.transformResponse(response.data);
    } catch (error) {
      console.error('getWalletBalance error:', error);
      return this.handleError(error);
    }
  }


  public async checkRequestStatus(accountNo: string, reference: string): Promise<emResponse> {
    const payload = { account_no: accountNo, reference };

    try {
      const response = await this.axiosInstance.post('/mobile-money/check-status', payload);
      console.log('checkRequestStatus success:', response.data);
      return this.transformResponse(response.data);
    } catch (error) {
      console.error('checkRequestStatus error:', error);
      return this.handleError(error);
    }
  }
  // 🚀 Get available biller products
  public async getAvailableProducts(): Promise<emResponse> {
    try {
      const response = await this.axiosInstance.get('/products');
      console.log('getAvailableProducts success:', response.data);
      return this.transformResponse(response.data);
    } catch (error) {
      console.error('getAvailableProducts error:', error);
      return this.handleError(error);
    }
  }

  // 🧾 Get price list for a product
  public async getPriceList(productCode: string): Promise<emResponse> {
    try {
      const response = await this.axiosInstance.get(`/products/price-list?code=${productCode}`);
      console.log('getPriceList success:', response.data);
      return this.transformResponse(response.data);
    } catch (error) {
      console.error('getPriceList error:', error);
      return this.handleError(error);
    }
  }

  // 📍 Get choice list for a product
  public async getChoiceList(productCode: string): Promise<emResponse> {
    try {
      const response = await this.axiosInstance.get(`/products/choice-list?code=${productCode}`);
      console.log('getChoiceList success:', response.data);
      return this.transformResponse(response.data);
    } catch (error) {
      console.error('getChoiceList error:', error);
      return this.handleError(error);
    }
  }

  public normalizePhoneNumber(phoneNumber: string, countryCode: string): string {
    // Normalize phone number to E.164 format for UG/KE, and ensure + for 256 numbers
    if (!phoneNumber) return phoneNumber;
    let normalized = phoneNumber.replace(/\s+/g, '');

    if (countryCode === "UG") {
      // If starts with 0, replace with +256
      if (/^0\d{8,}$/.test(normalized)) {
        return normalized.replace(/^0/, '+256');
      }
      // If starts with 256 but no +, add +
      if (/^256\d{8,}$/.test(normalized)) {
        return '+' + normalized;
      }
      // If already starts with +256, return as is
      if (/^\+256\d{8,}$/.test(normalized)) {
        return normalized;
      }
    } else if (countryCode === "KE") {
      if (/^0\d{8,}$/.test(normalized)) {
        return normalized.replace(/^0/, '+254');
      }
      if (/^254\d{8,}$/.test(normalized)) {
        return '+' + normalized;
      }
      if (/^\+254\d{8,}$/.test(normalized)) {
        return normalized;
      }
    } else {
      // For other countries, if starts with 256 and no +, add +
      if (/^256\d{8,}$/.test(normalized)) {
        return '+' + normalized;
      }
      // If already has +, return as is
      if (/^\+\d{8,}$/.test(normalized)) {
        return normalized;
      }
    }
    return normalized;

  }


  public changePhoneNumberToDefault(phoneNumber: string, countryCode: string): string {
    if (countryCode === "UG") {
      return phoneNumber.replace(/^\+?256/, '0');
    } else if (countryCode === "KE") {
      return phoneNumber.replace(/^\+?254/, '0');
    } else {
      return phoneNumber;
    }
  }
  
  // ✅ Validate a biller product purchase
  public async validateProduct(
    msisdn: string,
    amount: number,
    productCode: string,
    contactPhone: string,
    locationId?: string
  ): Promise<emResponse> {
    const reference = this.generateReference()
    const payload: any = {
      account_no: businessAccount,
      reference: reference,
      msisdn: msisdn,
      amount,
      product_code: productCode,
      contact_phone: this.changePhoneNumberToDefault(contactPhone, "UG")
    };

    if (locationId) {
      payload.location_id = locationId;
    }

    try {
      console.log(`validateProduct`, payload)
      new Model().logOperation(`BILLER_VALIDATE`, reference, businessAccount, "REQUEST", payload)
      const response = await this.axiosInstance.post('/products/validate', payload);
      console.log('validateProduct success:', response.data);
      new Model().logOperation(`BILLER_VALIDATE`, reference, businessAccount, "RESPONSE", response.data)
      return this.transformResponseBiller(response.data);
    } catch (error) {
      console.error('validateProduct error:', error);
      return this.handleError(error);
    }
  }

  // 🛒 Purchase a validated biller product
  public async purchaseProduct(
    validationReference: string
  ): Promise<emResponse> {
    const payload = {
      account_no: businessAccount,
      validation_reference: validationReference,
    };

    try {
      new Model().logOperation(`BILLER_PAYMENT`, validationReference, businessAccount, "REQUEST", payload)
      const response = await this.axiosInstance.post('/products/purchase', payload);
      console.log('purchaseProduct success:', response.data);
      new Model().logOperation(`BILLER_RESPONSE`, validationReference, businessAccount, "RESPONSE", response.data)
      return this.transformResponse(response.data);
    } catch (error) {
      console.error('purchaseProduct error:', error);
      return this.handleError(error);
    }
  }
}

export default RelworxMobileMoney;
