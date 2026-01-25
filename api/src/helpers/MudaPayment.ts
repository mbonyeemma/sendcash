import axios from "axios";
import { getItem, setItem } from "./connectRedis";

class MUDAPay {
  private mainURL: string;
  private mainRequestHeader: Record<string, string>;

  constructor() {
    this.mainURL = process.env.MUDA_URL || "";
    // Removed the static Authorization header since JWT is now obtained from Redis
    this.mainRequestHeader = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    console.log("mainRequestHeader", this.mainRequestHeader);
  }

  // Helper method to obtain headers with JWT from Redis
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await getItem("muda_jwt_token");
    const headers = { ...this.mainRequestHeader };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // Handle successful responses
  private handleResponse(response: any) {
    return response.data;
  }

  // Handle errors uniformly
  private handleError(error: any, method: string, endpoint: string) {
    console.error(`[${method} ERROR] - ${this.mainURL}${endpoint}`, error);
    return error;
  }

  // Reusable POST Request Method with JWT handling
  private async postRequest(endpoint: string, data: any) {
    const url = `${this.mainURL}/${endpoint}`;
    console.log("postRequest", url);
    let headers = await this.getAuthHeaders();

    console.log(`[POST REQUEST] - ${url}`, { data, headers });

    try {
      const response = await axios.post(url, data, { headers });
      console.log(`[POST RESPONSE] - ${url}`, response.data);
      return this.handleResponse(response);
    } catch (error: any) {
      if (error.response && error.response.status === 403) {
        console.log("Received 402 status code. Fetching new JWT token and retrying...");
        const newToken = await this.getJWT();
        headers['Authorization'] = `Bearer ${newToken}`;

        try {
          const response = await axios.post(url, data, { headers });
          console.log(`[POST RESPONSE - RETRY] - ${url}`, response.data);
          return this.handleResponse(response);
        } catch (retryError) {
          return this.handleError(retryError, "POST (retry)", endpoint);
        }
      }
      return this.handleError(error, "POST", endpoint);
    }
  }

  // Reusable GET Request Method with JWT handling
  private async getRequest(endpoint: string) {
    const url = `${this.mainURL}${endpoint}`;
    let headers = await this.getAuthHeaders();

    console.log(`[GET REQUEST] - ${url}`, { headers });

    try {
      const response = await axios.get(url, { headers });
      console.log(`[GET RESPONSE] - ${url}`, response.data);
      return this.handleResponse(response);
    } catch (error: any) {
      if (error.response && error.response.status === 403) {
        console.log("Received 402 status code. Fetching new JWT token and retrying...");
        const newToken = await this.getJWT();
        headers['Authorization'] = `Bearer ${newToken}`;

        try {
          const response = await axios.get(url, { headers });
          console.log(`[GET RESPONSE - RETRY] - ${url}`, response.data);
          return this.handleResponse(response);
        } catch (retryError) {
          return this.handleError(retryError, "GET (retry)", endpoint);
        }
      }
      return this.handleError(error, "GET", endpoint);
    }
  }

  // Retrieves a transaction by its ID
  public async getTransactionById(transactionId: string) {
    const endpoint = `/payment/transaction/${transactionId}`;
    return this.getRequest(endpoint);
  }

  public async requestPayIn(
    referenceId: string,
    amount: number,
    accountNumber: string
  ) {
    const endpoint = "payment/direct-payin";
    const data = {
      reference_id: referenceId,
      amount,
      trans_type: "PULL",
      currency: "UGX",
      product_id: 10011,

      account_number: accountNumber,
    };

    return this.postRequest(endpoint, data);
  }

  public async makeCollection(
    referenceId: string,
    amount: number,
    accountNumber: string
  ) {
    const endpoint = "payment/direct-collection";
    const data = {

      "reference_id": referenceId,
      "amount": amount,
      "trans_type": "PULL",
      "currency": "UGX",
      "product_id": 10012,
      "phone": accountNumber,
      "account_number": accountNumber

    };

    return this.postRequest(endpoint, data);
  }
  public async makePayout(
    referenceId: string,
    amount: number,
    accountNumber: string
  ) {
    const endpoint = "payment/direct-payout";
    const data = {
      reference_id: referenceId,
      amount,
      trans_type: "PUSH",
      currency: "UGX",
      product_id: 10011,
      account_number: accountNumber,
    };

    return this.postRequest(endpoint, data);
  }

  public async getTransactionReference(id: string) {
    const endpoint = `/payment/transactionReference/${id}`;
    return this.getRequest(endpoint);
  }
  // Retrieves a JWT, stores it in Redis, and returns the token
  public async getJWT() {
    console.log("Fetching JWT token...");
    // Ensure the URL is correct (add a slash if necessary)
    const url = `${this.mainURL}/clients/oauth/token`;
    const body = {
      secret_key: process.env.MUDA_SECRET_KEY,
      api_key: process.env.MUDA_API_KEY,
    };
    console.log("body", body);
    try {
      const response = await axios.post(url, body, { headers: this.mainRequestHeader });
      console.log("JWT token response:", response.data);
      const { access_token, expires_in } = response.data.data;

      await setItem("muda_jwt_token", access_token);
      console.log("JWT token saved to Redis");

      return access_token;
    } catch (error) {
      console.error("Error fetching JWT token:", error);
      return null;
    }
  }
}

export default new MUDAPay();
