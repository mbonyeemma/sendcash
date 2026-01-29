/**
 * Wallet Model – XRPL onramp/offramp only (RLUSD).
 */

import Modal from '../libs/modal';
import { User } from './User';
import { Encryption } from '../libs/encryption';
import crypto from 'crypto';
import { Request } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import * as db from '../libs/db.helper';
import RelworxMobileMoney from '../thirdparty/Relworx';
import jwt from 'jsonwebtoken';
import SMSHelper from '../helpers/SMSHelper';
import payment from './payment';
import { BillerInfo } from '../helpers/interfaces';
import { messageTypes } from '../libs/modal';

const smsHelper = new SMSHelper();
const paymentModel = new payment();
const mm = new RelworxMobileMoney();
smsHelper.initializeSMSClient();
interface CryptoWebhookData {
  amount: string;
  asset_code: string;
  contract_address: string;
  fee: string;
  from_address: string;
  to_address: string;
  hash: string;
  date: string;
  confirmation: boolean;
}

interface TransactionRecord {
  transaction_id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'bet' | 'win';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  recipient_id?: string;
  created_at: Date;
}

interface userObject {
  payment_method: string;
  name: string;
  fee: number;
  amount: number;
}

interface WalletRecord {
  id?: string;
  user_id: string;
  chain: string;
  publicKey: string;
  secret: string;
  mnemonic?: string;
  created_at?: Date;
}

export class Wallet extends Modal {
  async validateUserAccount(body: any) {
    const { userId, receiver_account, amount, payment_method } = body;

    let userObj = null
    if (payment_method == "MOBILE_MONEY") {
      userObj = {
        payment_method: payment_method,
        name: "Test User",
        fee: 0,
        amount: 0
      }
    } else if (payment_method == "WALLET") {
      const userwallet: any = await this.getUserById(receiver_account);
      if (!userwallet) {
        return this.makeResponse(404, "Wallet not found");
      }
      userObj = {
        payment_method: payment_method,
        name: userwallet.full_name,
        fee: 0,
        amount: amount
      }
    }

    return this.makeResponse(200, "response", userObj);

  }
  async saveLog(log: string, data: any) {
    const logData = {
      operation: log,
      data: typeof data === 'string' ? data : JSON.stringify(data)
    }
    await this.insertData("webhook_logs", logData);
  }

  async saveBlockchainTransaction(webhookData: any) {
    try {
      const response = await this.insertData("blockchain_transactions", webhookData);
      return response;
    } catch (error) {
      console.log("Error in saveBlockchainTransaction", error);
      return false;
    }
  }
  async cryptoWebhook(_data: any) {
    return this.makeResponse(200, "XRPL-only: crypto webhook ignored");
  }

  async HandleWebhook(data: any) {
    console.log("HandleWebhook", data);
    if (data.type === "transaction_status" && data.status === "SUCCESS") {
      const transaction = await this.selectDataQuery(
        `wl_transactions`,
        `trans_id='${data.transaction_id}' and status='PENDING'`
      );

      if (transaction.length > 0) {
        await this.issueTokens(data.transaction_id);
      }
    }
  }

  async getSupportedAssets() {
    return this.makeResponse(200, "Supported assets", { assets: ["RLUSD"] });
  }

  async stableCoinDeposit(_body: any) {
    return this.makeResponse(400, "Use onramp flow: POST /provider/onrampRequest");
  }

  async getDepositAddresses(userId: string) {
    return this.makeResponse(200, "XRPL-only: use your own XRPL address for onramp", { addresses: [] });
  }



  /**
   * Get onramp quote: UGX <-> RLUSD with rate and fee.
   */
  async getOnrampQuote(body: any) {
    try {
      const { amount_ugx, amount_rlusd } = body;
      const rate = 1 / 3720; // UGX per RLUSD (example; use getExchangeRate in production)
      const feePct = 0.005;
      let amount_ugx_num = 0;
      let amount_rlusd_num = 0;
      const ugxVal = amount_ugx != null ? parseFloat(String(amount_ugx)) : NaN;
      const rlusdVal = amount_rlusd != null ? parseFloat(String(amount_rlusd)) : NaN;
      if (!isNaN(ugxVal) && ugxVal > 0) {
        amount_ugx_num = ugxVal;
        const fee = amount_ugx_num * feePct;
        amount_rlusd_num = (amount_ugx_num - fee) * rate;
      } else if (!isNaN(rlusdVal) && rlusdVal > 0) {
        amount_rlusd_num = rlusdVal;
        amount_ugx_num = amount_rlusd_num / rate;
        const fee = amount_ugx_num * feePct;
        amount_ugx_num = amount_ugx_num + fee;
      } else {
        return this.makeResponse(400, "Provide amount_ugx or amount_rlusd");
      }
      const fee_ugx = amount_ugx_num * feePct;
      return this.makeResponse(200, "Quote", {
        amount_ugx: Math.round(amount_ugx_num * 100) / 100,
        amount_rlusd: parseFloat(amount_rlusd_num.toFixed(6)),
        rate,
        fee_ugx: Math.round(fee_ugx * 100) / 100,
        fee_pct: feePct,
        expires_in_seconds: 300,
      });
    } catch (e: any) {
      return this.makeResponse(500, e?.message || "Quote failed");
    }
  }

  /**
   * Create onramp request: pending transaction and pay-in instructions (PAY_IN_ADDRESS + reference).
   * Wallet takes over when payment is confirmed via confirmOnrampPayIn.
   */
  async createOnrampRequest(body: any) {
    try {
      const { userId, amount_ugx, amount_rlusd, destination_address, account_number, network } = body;
      const payInAddress = process.env.PAY_IN_ADDRESS || '';
      if (!userId || !destination_address) {
        return this.makeResponse(400, "userId and destination_address required");
      }
      const ugx = parseFloat(amount_ugx);
      const rlusd = parseFloat(amount_rlusd);
      if (isNaN(ugx) || ugx <= 0 || isNaN(rlusd) || rlusd <= 0) {
        return this.makeResponse(400, "Valid amount_ugx and amount_rlusd required");
      }
      const refId = "O" + this.getRandomString().substring(0, 10).toUpperCase();
      const narration = "DEST:" + destination_address;
      const transaction = await this.createTransactionRecord(
        userId,
        userId,
        "1000010",
        "UGX",
        ugx,
        "rlusd_onramp",
        "MOBILE",
        refId,
        narration,
        account_number || "",
        "RLUSD",
        rlusd,
        0
      );
      if (!transaction) {
        return this.makeResponse(400, "Failed to create onramp request");
      }
      await this.updateData("wl_transactions", `trans_id='${transaction.trans_id}'`, { status: "PENDING_ONRAMP" });
      const instructions = payInAddress
        ? `Pay ${ugx} UGX to ${payInAddress} with reference ${refId}`
        : "Complete the payment prompt on your phone.";
      return this.makeResponse(200, "Onramp request created", {
        trans_id: transaction.trans_id,
        reference: refId,
        pay_in_address: payInAddress || undefined,
        amount_ugx: ugx,
        amount_rlusd: rlusd,
        instructions,
        expires_in_seconds: 3600,
      });
    } catch (e: any) {
      console.error("createOnrampRequest", e);
      return this.makeResponse(500, e?.message || "Create onramp request failed");
    }
  }

  /**
   * Confirm pay-in received (provider/webhook): mark RECEIVED and trigger wallet to send RLUSD.
   */
  async confirmOnrampPayIn(reference: string) {
    try {
      const safeRef = (reference || "").replace(/'/g, "''");
      const rows = (await this.callQuery(
        `SELECT * FROM wl_transactions WHERE ref_id='${safeRef}' AND status='PENDING_ONRAMP' LIMIT 1`
      )) as any[];
      if (!rows || rows.length === 0) {
        return this.makeResponse(404, "No pending onramp for reference");
      }
      const tx = rows[0];
      await this.updateData("wl_transactions", `trans_id='${tx.trans_id}'`, { status: "RECEIVED" });
      return await this.issueRlusdToUser(tx.trans_id);
    } catch (e: any) {
      console.error("confirmOnrampPayIn", e);
      return this.makeResponse(500, e?.message || "Confirm pay-in failed");
    }
  }

  /**
   * Send RLUSD from onramp source to user's destination (wallet takes over).
   */
  async issueRlusdToUser(transId: string) {
    try {
      const rows = (await this.callQuery(
        `SELECT * FROM wl_transactions WHERE trans_id='${transId}' AND status='RECEIVED' LIMIT 1`
      )) as any[];
      if (!rows || rows.length === 0) {
        return this.makeResponse(404, "Transaction not found or not received");
      }
      const tx = rows[0];
      if (tx.trans_type !== "rlusd_onramp") {
        return this.makeResponse(400, "Not an RLUSD onramp transaction");
      }
      await this.updateData("wl_transactions", `trans_id='${transId}'`, { status: "INPROGRESS" });
      const narration = tx.narration || "";
      const destMatch = narration.match(/^DEST:(r[a-zA-Z0-9]{24,34})/);
      const destination = destMatch ? destMatch[1] : "";
      if (!destination) {
        await this.updateData("wl_transactions", `trans_id='${transId}'`, { status: "DEPOSIT_ERROR" });
        return this.makeResponse(400, "Missing destination address");
      }
      const amountRlusd = String(tx.asset_amount || tx.amount || 0);
      const { sendRlusdToDestination } = await import("../services/rlusdOnrampSender");
      const result = await sendRlusdToDestination(destination, amountRlusd, transId);
      if (result.error) {
        await this.updateData("wl_transactions", `trans_id='${transId}'`, { status: "DEPOSIT_ERROR" });
        return this.makeResponse(500, result.error);
      }
      await this.updateData("wl_transactions", `trans_id='${transId}'`, {
        status: "SUCCESS",
        hash: result.hash || undefined,
      });
      return this.makeResponse(200, "RLUSD sent successfully", { hash: result.hash });
    } catch (e: any) {
      console.error("issueRlusdToUser", e);
      return this.makeResponse(500, e?.message || "Issue RLUSD failed");
    }
  }

  /**
   * Buy RLUSD via mobile money: send a payment request (popup) to the user's phone.
   * User approves on their phone; when payment is received, confirmOnrampPayIn issues RLUSD.
   */
  async depositRequest(body: any) {
    try {
      const { userId, amount, currency, account_number, destination_address, amount_rlusd } = body;
      if (!userId || !destination_address) {
        return this.makeResponse(400, "userId and destination_address required");
      }
      const ugx = parseFloat(amount);
      if (isNaN(ugx) || ugx <= 0) {
        return this.makeResponse(400, "Valid amount required");
      }
      const phone = (account_number || "").replace(/\D/g, "");
      if (!phone) {
        return this.makeResponse(400, "Phone number (account_number) required");
      }
      const businessAccount = process.env.RELWORX_BUSINESS_ACCOUNT || "";
      if (!businessAccount) {
        return this.makeResponse(400, "Mobile money not configured (RELWORX_BUSINESS_ACCOUNT)");
      }
      const refId = "O" + this.getRandomString().substring(0, 10).toUpperCase();
      const rlusd = amount_rlusd != null ? parseFloat(String(amount_rlusd)) : ugx / 3720;
      const narration = "DEST:" + destination_address;
      const transaction = await this.createTransactionRecord(
        userId,
        userId,
        "1000010",
        currency || "UGX",
        ugx,
        "rlusd_onramp",
        "MOBILE",
        refId,
        narration,
        phone,
        "RLUSD",
        rlusd,
        0
      );
      if (!transaction) {
        return this.makeResponse(400, "Failed to create deposit request");
      }
      await this.updateData("wl_transactions", `trans_id='${transaction.trans_id}'`, { status: "PENDING_ONRAMP" });
      const requestResult = await mm.requestPayment(
        businessAccount,
        refId,
        phone,
        currency || "UGX",
        ugx,
        "Buy RLUSD"
      );
      if (requestResult.status !== 200) {
        await this.updateData("wl_transactions", `trans_id='${transaction.trans_id}'`, { status: "FAILED" });
        return this.makeResponse(requestResult.status, requestResult.message || "Failed to send payment request");
      }
      const maskedPhone = phone.length >= 4
        ? phone.slice(0, 3) + " *** *** " + phone.slice(-3)
        : "*** *** ***";
      return this.makeResponse(200, "A popup has been sent to your phone. Please approve it.", {
        phone: maskedPhone,
        phone_raw: phone,
        reference: refId,
        amount_ugx: ugx,
        amount_rlusd: rlusd,
      });
    } catch (e: any) {
      console.error("depositRequest", e);
      return this.makeResponse(500, e?.message || "Deposit request failed");
    }
  }


  async issueTokens(transId: string) {
    try {
      const transInfo = await this.selectDataQuery(`wl_transactions`, `trans_id='${transId}' and status='RECEIVED'`);

      if (transInfo.length == 0) {
        return this.makeResponse(404, "Transaction not found");
      }
      if (transInfo[0].trans_type === "rlusd_onramp") {
        return await this.issueRlusdToUser(transId);
      }
      return this.makeResponse(400, "Unsupported transaction type (XRPL-only)");
    } catch (error: unknown) {
      console.log("escrowAmount", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return { status: 403, message: errorMessage };
    }
  }



  async createTransactionRecord(
    user_id: string,
    dr_wallet_id: string,
    cr_wallet_id: string,
    currency: string,
    amount: number,
    trans_type: string,
    payment_method: string,
    ref_id: string,
    narration: string,
    account_number: string,
    asset_code?: string,
    asset_amount: number = 0,
    fee: number = 0
  ): Promise<any> {
    try {
      const newTransaction = {
        trans_id: `t${this.getRandomString()}`,
        user_id,
        dr_wallet_id,
        cr_wallet_id,
        asset: asset_code || currency,
        currency,
        asset_amount: asset_amount,
        amount: amount,
        trans_type,
        payment_method,
        ref_id,
        narration,
        account_number,
        fee: fee,
        running_balance: 0,
        running_balance_dr: 0,
        status: 'PENDING'
      };
      console.log(`newTransaction`, newTransaction);

      await this.insertData('wl_transactions', newTransaction);
      return newTransaction
    } catch (error) {
      console.error('Error creating transaction record:', error);
      return false
    }
  }

  async getBalances(userId: string): Promise<any> {
    const user = await this.getWallet(userId);
    if (!user) return { status: 404, message: 'User not found' };
    return { status: 200, message: 'XRPL-only: check your XRPL wallet (e.g. GemWallet) for RLUSD balance', data: [] };
  }

  async getBalance(data: any, token: string): Promise<any> {
    const { userId } = data;
    const user = await this.getWallet(userId);
    if (!user) return { status: 404, message: 'User not found' };
    return {
      status: 200,
      message: 'XRPL-only: balance is on your XRPL wallet',
      data: { balance: 0, token: token || 'RLUSD', issuer: '' }
    };
  }

  async getUser(userId: string) {
    const user: any = await this.callQuery(`SELECT full_name, username, phone_number FROM sia_users WHERE user_id='${userId}'`);
    return user[0];
  }
  async getStatement(userId: string, limit: number = 20, offset: number = 0): Promise<any> {
    try {
      console.log(`Getting statement for user ${userId}`);

      // Get user to verify existence
      const user = await this.getWallet(userId);
      if (!user) {
        console.log(`User ${userId} not found`);
        return {
          status: 404,
          message: 'User not found'
        };
      }

      // Get transactions from database
      const transactions: any = await this.callQuery(
        `SELECT * FROM wl_transactions 
         WHERE user_id = '${userId}'  and status !='PENDING'
         ORDER BY id DESC 
         LIMIT 50`
      );
      const txArray = [];

      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];
        const sender = await this.getUser(transaction.user_id);
        const receiver = await this.getUser(transaction.cr_wallet_id);
        transactions[i].sender = sender
        transactions[i].receiver = receiver
        txArray.push(transaction)
      }


      return {
        status: 200,
        message: 'Statement retrieved successfully',
        data: {
          transactions: txArray
        }
      };
    } catch (error) {
      console.error('Get statement error:', error);
      return {
        status: 500,
        message: 'Failed to get statement'
      };
    }
  }

  async getKeys(userId: string): Promise<any> {
    try {
      console.log(`Getting wallet keys for user ${userId}`);

      // Get user to get public key
      const user = await this.getWallet(userId);
      if (!user) {
        console.log(`User ${userId} not found`);
        return {
          status: 404,
          message: 'User not found'
        };
      }


      return {
        status: 200,
        message: 'Wallet keys retrieved successfully',
        data: {
          public_key: user.publicKey
        }
      };
    } catch (error) {
      console.error('Get wallet keys error:', error);
      return {
        status: 500,
        message: 'Failed to get wallet keys'
      };
    }
  }




  async webhookRel(data: any) {
    try {
      console.log(`webhookRel`, data)

      const { status, charge, customer_reference } = data;

      if (!customer_reference) {
        return this.makeResponse(400, "Customer reference is required");
      }

      // Retrieve the transaction using the internal reference
      const transaction: any = await this.callQuery(`SELECT * FROM wl_transactions WHERE trans_id='${customer_reference}'`);
      if (transaction.length === 0) {
        return this.makeResponse(404, "Transaction not found");
      }

      // Update the transaction status based on the webhook data
      const updatedStatus = status === "success" ? "SUCCESS" : "FAILED";
      await this.updateData('wl_transactions', `trans_id='${customer_reference}'`, { provider_fee: charge, status: updatedStatus });

      if (updatedStatus == "SUCCESS") {
        const userInfo: any = await this.getUser(transaction[0].user_id);
        const narration = transaction[0].narration;
        const account_number = transaction[0].account_number;
        const trans_type = transaction[0].trans_type;
        const { full_name, username } = userInfo;
        const phone_number = userInfo.phone_number;

        if (account_number != phone_number) {
          const message = `Greetings, you have received ${transaction[0].amount} ${transaction[0].currency} from ${full_name} with reason ${narration} via KITY PAY on ${new Date().toLocaleString()}. Download KITYPAY app on playstore and send money for less.`;
          this.saveNotification(transaction[0].user_id, "EXTERNAL_TRANSFER", "Transaction", message);
          await new SMSHelper().sendEgoSMS(account_number, message);
        }
      }

      return this.makeResponse(200, "Transaction status updated successfully");
    } catch (error: any) {
      console.error("Error handling webhook:", error.message);
      return this.makeResponse(500, "Error handling webhook", { error: error.message });
    }
  }





  async getExchangeRate(data: any) {
    try {
      const { from_currency, to_currency } = data;

      if (!from_currency || !to_currency) {
        return this.makeResponse(400, "From currency and to currency are required");
      }

      // Hardcoded exchange rate for now
      const exchangeRate = 3570;

      return this.makeResponse(200, "Exchange rate retrieved successfully", {
        from_currency,
        to_currency,
        rate: exchangeRate,
      });
    } catch (error: any) {
      console.error("Error retrieving exchange rate:", error.message);
      return this.makeResponse(500, "Error retrieving exchange rate", { error: error.message });
    }
  }


  async setTransactionPin(data: any) {
    try {
      console.log("setTransactionPin", data);
      const { userId, pin, confirm_pin } = data;
      if (!userId || !pin) {
        return this.makeResponse(400, "User ID and PIN are required");
      }
      if (pin !== confirm_pin) {
        return this.makeResponse(400, "PIN and confirm PIN do not match");
      }

      // Hash the PIN using SHA-256.
      const hashedPin = this.hashPin(pin);
      await this.updateData('sia_users', `user_id= '${userId}'`, { wallet_pin: hashedPin });
      return this.makeResponse(200, "Transaction PIN set successfully");
    } catch (error: any) {
      console.error("Error setting transaction PIN:", error.message);
      return this.makeResponse(500, "Error setting transaction PIN", { error: error.message });
    }
  }







  async getTransactionById(transactionId: string) {
    try {
      console.log(`transactionId`, transactionId)
      if (!transactionId) {
        return this.makeResponse(400, "Transaction ID is required");
      }

      const transaction: any = await this.callQuery(`SELECT * FROM wl_transactions WHERE trans_id='${transactionId}'`);
      if (transaction.length === 0) {
        return this.makeResponse(404, "Transaction not found");
      }

      return this.makeResponse(200, "Transaction retrieved successfully", transaction[0]);
    } catch (error: any) {
      console.error("Error retrieving transaction:", error.message);
      return this.makeResponse(500, "Error retrieving transaction", { error: error.message });
    }
  }

  async resetTransactionPIN(data: any) {
    try {
      const { userId } = data;
      if (!userId) {
        return this.makeResponse(400, "User ID is required");
      }
      const newPin = Math.floor(10000 + Math.random() * 90000).toString();

      // Retrieve the user's current hashed PIN from the database.
      const user: any = await this.callQuery(`SELECT wallet_pin FROM users WHERE user_id='${userId}'`);
      if (user.length === 0) {
        return this.makeResponse(404, "User not found");
      }

      const hashedNewPin = this.hashPin(newPin);

      const existingUser = await this.getUserById(userId);
      if (existingUser.length === 0) {
        return this.makeResponse(401, "Auth error");
      }
      const email = existingUser[0].email;
      const user_id = existingUser[0].user_id;
      const first_name = existingUser[0].first_name;

      await this.updateData('sia_users', `wallet_pin: '${hashedNewPin}'`, { user_id: userId });
      return this.makeResponse(200, "Transaction PIN reset successfully");

    } catch (error: any) {
      console.error("Error resetting transaction PIN:", error.message);
      return this.makeResponse(500, "Error resetting transaction PIN", { error: error.message });
    }
  }
  async changeTransactionPin(data: any) {
    try {
      const { userId, oldPin, newPin, confirmPin } = data;
      if (!userId) {
        return this.makeResponse(400, "User ID is required");
      }
      if (!oldPin || !newPin || !confirmPin) {
        return this.makeResponse(400, "Old PIN, new PIN, and confirm PIN are required");
      }
      if (newPin !== confirmPin) {
        return this.makeResponse(400, "New PIN and confirm PIN do not match");
      }

      // Retrieve the user's current hashed PIN from the database.
      const user: any = await this.callQuery(`SELECT wallet_pin FROM users WHERE user_id='${userId}'`);
      if (user.length === 0) {
        return this.makeResponse(404, "User not found");
      }

      // Validate the old PIN.
      const hashedOldPin = this.hashPin(oldPin);
      if (user[0].wallet_pin !== hashedOldPin) {
        return this.makeResponse(401, "Invalid old PIN");
      }

      // Hash the new PIN.
      const hashedNewPin = this.hashPin(newPin);
      await this.updateData('sia_users', `wallet_pin: '${hashedNewPin}'`, { user_id: userId });
      return this.makeResponse(200, "Transaction PIN reset successfully");
    } catch (error: any) {
      console.error("Error resetting transaction PIN:", error.message);
      return this.makeResponse(500, "Error resetting transaction PIN", { error: error.message });
    }
  }


  async GetWallet(userId: string, currency: string) {
    const wallet = await this.generateWallet(userId);
    console.log("wallet", wallet)
    return this.makeResponse(200, "success", wallet);
  }

  async getTransactionStatement(data: any, currency: string) {
    const { userId } = data;
    const transactions = await this.callQuery(`select * from wl_transactions where (dr_wallet_id='${userId}' OR cr_wallet_id='${userId}') AND currency='${currency}' and status !='PENDING' order by id desc`);
    return this.makeResponse(200, "Transaction statement retrieved successfully", transactions);

  }


  async getPaymentTypesv2(operation: string = 'ALL', country: any = 'ALL') {
    let paymentMethods: any = []
    paymentMethods = await this.callQuery(`SELECT * FROM payment_types WHERE (country='${country}' OR country='ALL') AND (operation='${operation}' OR operation='ALL')`);
    //const data = paymentMethods.map((method: any) => method.type);
    // const data = ["WALLET", "MOBILE", "BANK", "CARD"]
    return this.makeResponse(200, "success", paymentMethods);
  }

  async getPaymentType(type: string) {
    const paymentType: any = await this.callQuery(`SELECT * FROM payment_types WHERE type='${type}'`);
    return paymentType.length > 0 ? paymentType[0] : null;
  }

  async getPaymentTypes(operation: string = 'ALL', country: any = 'ALL') {
    let paymentMethods: any = []
    if (country == "ALL") {
      paymentMethods = await this.callQuery(`SELECT * FROM payment_types `);
    } else {
      paymentMethods = await this.callQuery(`SELECT * FROM payment_types WHERE (country='${country}' OR country='ALL') AND (operation='${operation}' OR operation='ALL')`);
    }

    // const data = paymentMethods.map((method: any) => method.type);
    // const data = ["WALLET", "MOBILE", "BANK", "CARD"]
    return this.makeResponse(200, "success", paymentMethods);
  }





  async login(data: any) {
    try {
      const { userId, pin } = data;
      const pinValidation = await this.validatePin(userId, pin);
      return pinValidation;

    } catch (error: any) {
      console.error("Error during login:", error.message);
      return this.makeResponse(500, "Error during login", { error: error.message });
    }
  }



  async makeThirdpartyTransfer(
    transId: string,
    userId: string,
    amount: number,
    paymentMethod: string,
    account_number: string,
    currency: string,
    payout_currency: string,
    narration: string,
    refId: string,
    billerInfo: BillerInfo = null
  ) {
    try {
      console.log(`makeThirdpartyTransfer`, userId, amount, paymentMethod, account_number, currency, payout_currency, narration, refId)

      let thirdpartyAccount = account_number;



      const payout_amount = amount; // The amount to be paid out in UGX

      let status = "PENDING";
      let message = "payout pending";
      let statusCode = 202;

      let thirdpartyPayResponse: any = null;
      let external_reference = "";

      if (paymentMethod == "WALLET") {
        await this.updateTransactionStatus(transId, "SUCCESS", { status: "SUCCESS", message: "payout successful" });
        return this.makeResponse(200, "payout successful", thirdpartyPayResponse);

      } else if (paymentMethod == "MOBILE_MONEY") {
        thirdpartyPayResponse = await mm.sendPayment(thirdpartyAccount, transId, account_number, payout_currency, payout_amount, narration);
        external_reference = thirdpartyPayResponse.internal_reference || "";
      } else if (paymentMethod == "BILLER") {
        let billerInfoData = billerInfo;
        let billerValidationReference = billerInfoData.validation_reference;

        thirdpartyPayResponse = await mm.purchaseProduct(billerValidationReference);
      } else {
        return this.makeResponse(400, "Invalid payment method");
      }


      console.log(`thirdpartyPay:`, thirdpartyPayResponse);
      if (thirdpartyPayResponse.status == 200) {
        statusCode = 200
        await this.updateTransactionStatus(transId, "SUCCESS", external_reference);
      } else if (thirdpartyPayResponse.status == 202) {
        statusCode = 200
        await this.updateTransactionStatus(transId, "SENT", external_reference);
      } else if (thirdpartyPayResponse.status == 400) {
        statusCode = 400
        await this.updateTransactionStatus(transId, "AWAITING_REVERSAL", external_reference);
      } else {
        statusCode = 403;
        message = "payout failed";
        await this.updateTransactionStatus(transId, "ON_HOLD", external_reference);
      }

      return this.makeResponse(statusCode, message, thirdpartyPayResponse);
    } catch (error: any) {
      console.error("Error processing mobile money payout:", error.message);
      return this.makeResponse(500, "Error processing mobile money payout", { error: error.message });
    }
  }

  async updateTransactionStatus(transId: string, status: string, external_reference: any) {
    await this.updateData("wl_transactions", `trans_id='${transId}'`, { status: status, external_reference });
    return true
  }

  async TransactionsAwaitingReversal() {
    const transactions: any = await this.callQuery(`SELECT * FROM wl_transactions WHERE status='AWAITING_REVERSAL'`);
    for (const transaction of transactions) {
      await this.reverseTransaction(transaction);
    }
    return this.makeResponse(200, "Transactions awaiting reversal reversed successfully");
  }

  async reverseTransaction(transaction: any) {
    await this.updateData("wl_transactions", `trans_id='${transaction.trans_id}'`, { status: "REVERSAL_INITIATED" });
    // XRPL-only: no Stellar reversal; mark for manual review
    await this.updateData("wl_transactions", `trans_id='${transaction.trans_id}'`, { status: "ON_HOLD" });
    return this.makeResponse(200, "Reversal marked for review");
  }

  async addPaymentMethod(data: any) {
    try {
      const { userId, type, currency, phone_number, country_code, network, account_name, bank_name, bank_code, account_number, bank_address, bank_phone_number, bank_country } = data;

      const user_id = userId

      // Allow known types (UI sends MOBILE/BANK; DB may use MOBILE_MONEY)
      const knownTypes = ['MOBILE', 'MOBILE_MONEY', 'BANK', 'WALLET', 'CARD', 'BILLER'];
      if (!knownTypes.includes(type)) {
        return this.makeResponse(400, "Invalid payment method");
      }

      if (!user_id || !type) {
        return this.makeResponse(400, "User ID and type are required");
      }

      const newPaymentMethod = {
        payment_method_id: "pm" + this.getRandomString(),
        user_id,
        type,
        currency,
        phone_number,
        country_code,
        network,
        account_name,
        bank_name,
        bank_code,
        account_number: type == "MOBILE" ? phone_number : account_number,
        bank_address,
        bank_phone_number,
        bank_country
      };

      await this.insertData('payment_methods', newPaymentMethod);
      return this.makeResponse(201, "Payment method added successfully", newPaymentMethod);
    } catch (error: any) {
      console.error("Error adding payment method:", error.message);
      return this.makeResponse(500, "Error adding payment method", { error: error.message });
    }
  }
  getRandomString() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  generateRandomDigits(length: number = 12): string {
    const digits = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return result;
  }

  async deletePaymentMethod(payment_method_id: string, userId: string) {
    try {
      if (!payment_method_id) {
        return this.makeResponse(400, "Payment method ID is required");
      }

      const method: any = await this.callQuery(`SELECT * FROM payment_methods WHERE payment_method_id='${payment_method_id}' `);

      if (method.length == 0) {
        return this.makeResponse(404, "Payment method not found");
      }

      await this.callQuery(`DELETE FROM payment_methods WHERE user_id='${userId}' AND payment_method_id='${payment_method_id}'`);
      return this.makeResponse(200, "Payment method deleted successfully");
    } catch (error: any) {
      console.error("Error deleting payment method:", error.message);
      return this.makeResponse(500, "Error deleting payment method", { error: error.message });
    }
  }


  async getUserPaymentMethod(paymentMethod: string) {
    return await this.callQuery(`SELECT * FROM payment_methods WHERE payment_method_id='${paymentMethod}' `);
  }

  async getUserPaymentMethods(q: any, user_id: string) {
    try {
      if (!user_id) {
        return this.makeResponse(400, "User ID is required");
      }
      let paymentMethods: any = []
      if (q.type) {
        paymentMethods = await this.callQuery(`SELECT * FROM payment_methods WHERE user_id='${user_id}' and type='${q.type}'`);

      } else {
        paymentMethods = await this.callQuery(`SELECT * FROM payment_methods WHERE user_id='${user_id}'`);

      }

      return this.makeResponse(200, "Payment methods retrieved successfully", paymentMethods);
    } catch (error: any) {
      console.error("Error retrieving payment methods:", error.message);
      return this.makeResponse(500, "Error retrieving payment methods", { error: error.message });
    }
  }
  async validateMerchant(data: any) {
    try {
      const { merchant_id, currency } = data;
      if (!merchant_id || !currency) {
        return this.makeResponse(400, "Invalid data");
      }
      const merchant: any = await this.callQuery(`SELECT currency,user_id as merchant_id,full_name,is_merchant,username FROM sia_users WHERE user_id='${merchant_id}' and is_merchant=1 and currency='${currency}'`);
      if (merchant.length == 0) {
        return this.makeResponse(404, "Merchant not found");
      }
      return this.makeResponse(200, "Merchant validated successfully", merchant[0]);
    } catch (error: any) {
      console.error("Error validating merchant:", error.message);
      return this.makeResponse(500, "Error validating merchant", { error: error.message });
    }
  }
  async payMerchant(data: any) {
    try {
      const {
        userId,
        currency,
        payment_mode,
        amount,
        pin,
        merchant_id
      } = data;
      if (!userId || !currency || !payment_mode || !amount || !pin || !merchant_id) {
        return this.makeResponse(400, "Invalid data");
      }
      const merchant: any = await this.callQuery(`SELECT * FROM sia_users WHERE user_id='${merchant_id}' and is_merchant=1`);
      if (merchant.length == 0) {
        return this.makeResponse(404, "Merchant not found");
      }
      const merchantInfo = merchant[0];


      return this.transferRequest(data)
    } catch (error: any) {
      console.error("Error processing merchant payment:", error.message);
      return this.makeResponse(500, "Error processing merchant payment", { error: error.message });
    }
  }

  async transferRequest(_data: any) {
    return this.makeResponse(400, "XRPL-only: use POST /wallet/rlusdPayoutRequest for offramp (send RLUSD on XRPL, receive UGX)");
  }

  /**
   * Create RLUSD offramp payout request. Returns XRPL destination address and memo.
   * User sends RLUSD from GemWallet to that address with this memo; listener then triggers mobile money.
   */
  async createRlusdPayoutRequest(data: any) {
    try {
      const {
        userId,
        amount,
        fiat_amount,
        payment_mode,
        account_number,
        bank_name,
        account_holder_name,
        network,
        payment_method_id,
        narration,
      } = data;

      if (!userId || !amount || parseFloat(amount) <= 0) {
        return this.makeResponse(400, "Invalid amount or user");
      }
      if (!payment_mode || !account_number) {
        return this.makeResponse(400, "Payment mode and account number are required");
      }

      const paymentType = await this.getPaymentType(payment_mode);
      const fee = paymentType?.fee ?? parseFloat(amount) * 0.01;
      const memo = "R" + this.getRandomString().substring(0, 12).toUpperCase();

      const transaction = await this.createTransactionRecord(
        userId,
        userId,
        "1000010",
        "UGX",
        parseFloat(fiat_amount || amount),
        "rlusd_offramp",
        payment_mode,
        memo,
        narration || "RLUSD offramp",
        account_number,
        "RLUSD",
        parseFloat(amount),
        fee
      );
      if (!transaction) {
        return this.makeResponse(400, "Failed to create payout request");
      }

      await this.updateData("wl_transactions", `trans_id='${transaction.trans_id}'`, { status: "PENDING_RLUSD" });

      const xrplDestination = process.env.XRPL_RLUSD_PAYOUT_ADDRESS || '';
      if (!xrplDestination) {
        return this.makeResponse(500, "RLUSD payout not configured (XRPL_RLUSD_PAYOUT_ADDRESS)");
      }

      return this.makeResponse(200, "Payout request created", {
        xrpl_destination: xrplDestination,
        memo,
        amount: parseFloat(amount),
        trans_id: transaction.trans_id,
        expires_in_seconds: 3600,
      });
    } catch (error: any) {
      console.error("createRlusdPayoutRequest error:", error);
      return this.makeResponse(500, error.message || "Failed to create payout request");
    }
  }

  /**
   * Process RLUSD payment received on custody account: find payout by memo and trigger mobile money.
   */
  async processRlusdPayoutReceived(memo: string, xrplTxHash: string) {
    try {
      const safeMemo = (memo || "").replace(/'/g, "''");
      const rows = (await this.callQuery(
        `SELECT * FROM wl_transactions WHERE ref_id='${safeMemo}' AND status='PENDING_RLUSD' LIMIT 1`
      )) as any[];
      if (!rows || rows.length === 0) {
        return this.makeResponse(404, "No pending payout for memo");
      }
      const tx = rows[0];
      await this.updateData("wl_transactions", `trans_id='${tx.trans_id}'`, { hash: xrplTxHash });
      const result = await this.makeThirdpartyTransfer(
        tx.trans_id,
        tx.user_id,
        parseFloat(tx.amount),
        tx.payment_method,
        tx.account_number,
        "RLUSD",
        "UGX",
        tx.narration || "RLUSD offramp",
        tx.ref_id,
        null
      );
      return result;
    } catch (error: any) {
      console.error("processRlusdPayoutReceived error:", error);
      return this.makeResponse(500, error.message || "Failed to process payout");
    }
  }



  async getAirdropTasks(): Promise<any> {
    try {
      const query = `
        SELECT * FROM airdrop_tasks 
        WHERE active = TRUE 
        ORDER BY reward DESC
      `;

      const result: any = await db.default.pdo(query);
      return {
        status: 200,
        message: "Airdrop tasks retrieved successfully",
        data: result || []
      };
    } catch (error: any) {
      console.error('Error getting airdrop tasks:', error);
      return {
        status: 500,
        message: error.message || 'Failed to get airdrop tasks',
        data: []
      };
    }
  }

  /**
   * Check if a user has already claimed a specific airdrop task 
   * within the cooldown period
   */
  async canClaimTask(userId: string, taskId: string): Promise<any> {
    try {
      // Get the task cooldown period
      const taskQuery = `
        SELECT cooldown_hours FROM airdrop_tasks
        WHERE id = ? AND active = TRUE
      `;
      const taskResult: any = await db.default.pdo(taskQuery, [taskId]);

      if (!taskResult || taskResult.length === 0) {
        return {
          status: 404,
          message: "Task not found or inactive",
          canClaim: false
        };
      }

      const cooldownHours = taskResult[0].cooldown_hours;

      // Check if user has already claimed this task within cooldown period
      const cooldownQuery = `
        SELECT id, created_at FROM performed_tasks
        WHERE user_id = ? AND task_id = ? AND status = 'APPROVED'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const cooldownResult: any = await db.default.pdo(cooldownQuery, [userId, taskId]);

      if (!cooldownResult || cooldownResult.length === 0) {
        // User has never claimed this task
        return {
          status: 200,
          message: "User can claim this task",
          canClaim: true
        };
      }

      // Calculate if cooldown period has passed
      const lastClaimDate = new Date(cooldownResult[0].created_at);
      const now = new Date();
      const diffHours = (now.getTime() - lastClaimDate.getTime()) / (1000 * 60 * 60);

      if (diffHours >= cooldownHours) {
        return {
          status: 200,
          message: "Cooldown period has passed, user can claim again",
          canClaim: true
        };
      } else {
        const hoursRemaining = Math.ceil(cooldownHours - diffHours);
        return {
          status: 429,
          message: `Task on cooldown. Available again in ${hoursRemaining} hour(s)`,
          canClaim: false,
          hoursRemaining
        };
      }
    } catch (error: any) {
      console.error('Error checking task claim eligibility:', error);
      return {
        status: 500,
        message: error.message || 'Failed to check task claim eligibility',
        canClaim: false
      };
    }
  }

  /**
   * Basic URL validation to check if the submitted URL is valid
   * This is a simple check, more robust validation can be added
   */
  validateTaskUrl(platform: string, url: string): boolean {
    if (!url) return false;

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return false;
    }

    // Platform-specific validation with regex
    switch (platform.toUpperCase()) {
      case 'TWITTER':
        return /twitter\.com|x\.com/i.test(url);
      case 'TIKTOK':
        return /tiktok\.com/i.test(url);
      case 'FACEBOOK':
        return /facebook\.com|fb\.com/i.test(url);
      case 'INSTAGRAM':
        return /instagram\.com/i.test(url);
      default:
        return true; // Allow other platforms
    }
  }

  /**
   * Claim an airdrop by submitting proof of task completion
   */
  async claimAirdrop(userId: string, taskId: string, platform: string, url: string): Promise<any> {
    try {
      // Validate URL
      if (!this.validateTaskUrl(platform, url)) {
        return {
          status: 400,
          message: `Invalid URL for ${platform} platform`
        };
      }

      // Check if user can claim this task (not on cooldown)
      const claimCheck = await this.canClaimTask(userId, taskId);
      if (!claimCheck.canClaim) {
        return claimCheck; // Return the error response
      }

      // Get task information
      const taskQuery = `SELECT * FROM airdrop_tasks WHERE id = ? AND active = TRUE`;
      const taskResult: any = await db.default.pdo(taskQuery, [taskId]);

      if (!taskResult || taskResult.length === 0) {
        return {
          status: 404,
          message: "Task not found or inactive"
        };
      }

      const task = taskResult[0];

      // Generate a unique ID for the performed task
      const performedTaskId = `pt-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

      // Record the performed task
      const insertQuery = `
        INSERT INTO performed_tasks (
          id, user_id, task_id, platform, url, status, reward
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      // Initial status is PENDING for manual verification
      const initialStatus = 'PENDING';
      await db.default.pdo(
        insertQuery,
        [performedTaskId, userId, taskId, platform, url, initialStatus, task.reward]
      );

      this.verifyAirdropTask(performedTaskId, "APPROVED");
      return {
        status: 200,
        message: `Airdrop task submitted successfully. It will be reviewed shortly.`,
        data: {
          performedTaskId,
          reward: task.reward,
          status: initialStatus
        }
      };
    } catch (error: any) {
      console.error('Error claiming airdrop:', error);
      return {
        status: 500,
        message: error.message || 'Failed to claim airdrop'
      };
    }
  }

  /**
   * Verify an airdrop task submission
   * This is for admin use to approve/reject task claims
   */
  async verifyAirdropTask(performedTaskId: string, status: 'APPROVED' | 'REJECTED', notes?: string): Promise<any> {
    try {
      if (!['APPROVED', 'REJECTED'].includes(status)) {
        return {
          status: 400,
          message: "Invalid status. Must be 'APPROVED' or 'REJECTED'"
        };
      }

      // Get task information
      const taskQuery = `
        SELECT pt.*, at.reward, pt.user_id 
        FROM performed_tasks pt
        JOIN airdrop_tasks at ON pt.task_id = at.id
        WHERE pt.id = ? AND pt.status = 'PENDING'
      `;
      const taskResult: any = await db.default.pdo(taskQuery, [performedTaskId]);

      if (!taskResult || taskResult.length === 0) {
        return {
          status: 404,
          message: "Task not found or already processed"
        };
      }

      const task = taskResult[0];


      const updateObj = {
        status: status,
        verified_at: new Date(),
        notes: notes || null
      }
      await this.updateData("performed_tasks", `id='${performedTaskId}'`, updateObj);

      // If approved, mark as PAID (XRPL-only: no Stellar airdrop)
      if (status === 'APPROVED') {
        await this.updateData("performed_tasks", `id='${performedTaskId}'`, { status: "PAID" });
      } else {
        // If rejected
        return {
          status: 200,
          message: "Task rejected",
          data: {
            performedTaskId,
            userId: task.user_id,
            status
          }
        };
      }
    } catch (error: any) {
      console.error('Error verifying airdrop task:', error);
      return {
        status: 500,
        message: error.message || 'Failed to verify airdrop task'
      };
    }
  }

  async getUserTaskHistory(userId: string): Promise<any> {
    try {
      const query = `
        SELECT * FROM performed_tasks
        WHERE user_id = ?
        ORDER BY created_at DESC
      `;
      const result: any = await db.default.pdo(query, [userId]);
      return {
        status: 200,
        message: "User task history retrieved successfully",
        data: result || []
      };
    } catch (error: any) {
      console.error('Error getting user task history:', error);
      return {
        status: 500,
        message: error.message || 'Failed to get user task history'
      };
    }
  }



} 