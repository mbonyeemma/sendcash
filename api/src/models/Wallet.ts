/**
 * Wallet Model
 * 
 * IMPORTANT: This module includes fixes for Moralis address validation issues.
 * Tron addresses (starting with 'T') are filtered out before being sent to Moralis
 * to prevent system lockups due to EVM address validation errors.
 * 
 * See: src/thirdparty/Moralis.ts for the filtering implementation.
 */

import Modal from '../libs/modal';
import { Recipient } from '../libs/Stellar';
import { User } from './User';
import { Encryption } from '../libs/encryption';
import crypto from 'crypto';
import { Request } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import MudaPayment from '../helpers/MudaPayment';
import * as db from '../libs/db.helper';
import { BlockchainHelper } from '../libs/blockchain.simple';
import RelworxMobileMoney from '../thirdparty/Relworx';
import config from '../config';
import jwt from 'jsonwebtoken';
import SMSHelper from '../helpers/SMSHelper';
import payment from './payment';
import BillerPay from '../thirdparty/BillerPayment';
import { BillerInfo } from '../helpers/interfaces';
import StellarService from '../libs/Stellar';
import { messageTypes } from '../libs/modal';
const blockchainHelper = new BlockchainHelper();
const smsHelper = new SMSHelper();
const paymentModel = new payment();
const mm = new RelworxMobileMoney();
const bp = new BillerPay();
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
  async getPendingTransactions() {
    const transactions = await this.selectDataQuery(`wl_transactions`, `status='PENDING'`);
    for (const transaction of transactions) {
      try {
        const created_on = transaction.created_on;
        const timecreated = new Date(created_on);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - timecreated.getTime());
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
        if (diffHours > 1) {
          this.updateData("wl_transactions", `trans_id='${transaction.trans_id}'`, { status: "EXPIRED" });
          continue;
        }
        const response = await MudaPayment.getTransactionReference(transaction.trans_id);
        console.log("MudaPaymentResponse", response);
        if (response[0].status == "SUCCESS") {
          this.issueTokens(transaction.trans_id);
        } else if (response.status == "INITIATED") {
          // this.updateData("wl_transactions", `trans_id='${transaction.trans_id}'`, { status: "SUCCESS" });
        } else if (response.status.toUpperCase() == "FAILED") {
          this.updateData("wl_transactions", `trans_id='${transaction.trans_id}'`, { status: "FAILED" });
        }
      } catch (error) {
        console.log("Error in getPendingTransactions", error);
      }
    }
  }
  stellar: any = new StellarService();
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
  async cryptoWebhook(data: any) {
    console.log("cryptoWebhook", data);
    this.saveLog("MORALIS_WEBHOOK", data);
    try {

      const webhookData: CryptoWebhookData = {
        amount: data.erc20Transfers[0].valueWithDecimals,
        asset_code: data.erc20Transfers[0].tokenSymbol,
        contract_address: data.erc20Transfers[0].contract,
        fee: data.txs[0].receiptGasUsed,
        from_address: data.erc20Transfers[0].from,
        to_address: data.erc20Transfers[0].to,
        hash: data.txs[0].hash,
        date: new Date(parseInt(data.block.timestamp) * 1000).toISOString(),
        confirmation: data.txs[0].receiptStatus === "1"
      };
      console.log("cryptoWebhook", JSON.stringify(webhookData));

      const cryptoValidationResult = this.validateCryptoDeposit(webhookData);
      if (!cryptoValidationResult.valid) {
        console.error('Crypto deposit validation failed', cryptoValidationResult.message);
       // return this.makeResponse(cryptoValidationResult.statusCode, cryptoValidationResult.message);
      }

      const blockchainAddress: any = await this.callQuery(
        `SELECT * FROM user_blockchain_addresses WHERE LOWER(address) = LOWER('${webhookData.to_address}')`
      );
      console.log("blockchainAddress", blockchainAddress);
      if (blockchainAddress.length === 0) {
        console.log("No matching address found for the transaction");
        return this.makeResponse(404, "No matching address found for the transaction");
      }
      const user_id = blockchainAddress[0].user_id;
      const userInfo: any = await this.getWallet(user_id);
      if (!userInfo) {
        return this.makeResponse(404, "User wallet not found");
      }
      const { currency } = userInfo;

      const cryptoTransaction: any = await this.selectDataQuery(`blockchain_transactions`, `hash='${webhookData.hash}'`);
      if (cryptoTransaction.length > 0) {
        console.log("Transaction already exists");
        return this.makeResponse(200, "Transaction already exists");
      }

      // const sent_amount = parseFloat(webhookData.amount.toString())
      //   const sql = `SELECT * FROM wl_transactions WHERE asset='${webhookData.asset_code}' and LOWER(ref_id)= LOWER('${webhookData.to_address}') AND status='PENDING' and asset_amount=${sent_amount} order by id desc limit 1`
      //   console.log("sql", sql);
      //   const transaction: any = await this.callQuery(sql);
      //   console.log("transaction", transaction);

      await this.saveBlockchainTransaction(webhookData);

      const rate = await paymentModel.getRate("USDC", currency);
      console.log("rate", rate);
      const rateValue = rate.data.rate;
      const sent_amount = parseFloat(webhookData.amount.toString())
      const expectedAmount = sent_amount * rateValue;
      console.log("expectedAmount", expectedAmount);

      const newTransaction = await this.createTransactionRecord(user_id, user_id, "ADMIN", currency, expectedAmount, "deposit", "crypto", webhookData.hash, "Deposit request", webhookData.to_address, webhookData.asset_code, sent_amount);
      if (newTransaction == false) {
        return this.makeResponse(400, "Failed to create transaction record");
      }
      const newTxId = newTransaction.trans_id;
      this.updateData("wl_transactions", `trans_id='${newTxId}'`, { hash: webhookData.hash, status: "RECEIVED" });
      await this.issueTokens(newTxId);


      /*
      // if the transaction was initiated
      if (transaction.length > 0) {
        this.updateData("wl_transactions", `trans_id='${transaction[0].trans_id}'`, { hash: webhookData.hash, status: "RECEIVED" });
        this.saveBlockchainTransaction(webhookData);
        await this.issueTokens(transaction[0].trans_id);
      }else{

        // need to get a users currency and rate

        /*
      
        */



      return this.makeResponse(200, "response", {
        message: "Transaction processed successfully"
      });
    } catch (error) {
      console.log("Error in cryptoWebhook", error);
      return this.makeResponse(500, "Error processing transaction", null);
    }
  }

  private validateCryptoDeposit(webhookData: CryptoWebhookData): { valid: boolean; statusCode: number; message: string } {
    const asset = webhookData.asset_code?.toUpperCase();
    console.log("asset", asset);
    console.log("webhookData.contract_address", webhookData.contract_address.toLocaleLowerCase());
    console.log("config.bscUsdcContract", config.bscUsdcContract.toLocaleLowerCase());

    if (asset == 'USDC' && webhookData.contract_address.toLocaleLowerCase() !== config.bscUsdcContract.toLocaleLowerCase()) {
      return { valid: false, statusCode: 400, message: 'Unsupported USDC contract address' };
    } else {
      return { valid: true, statusCode: 200, message: 'USDC contract validated' };
    }
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
    try {
      const response = await blockchainHelper.getSupportedAssets();
      return this.makeResponse(200, "Supported assets retrieved successfully", response);
    } catch (error) {
      console.error('Error in getSupportedAssets:', error);
      return this.makeResponse(500, 'Error getting supported assets', null);
    }
  }

  async stableCoinDeposit(body: any) {
    console.log("stableCoinDeposit", body);
    const { userId, amount, asset_code, chain_code, account_number } = body;
    const currency = "UGX"
    const refId = this.generateRandomDigits();

    if (amount < 1) {
      return this.makeResponse(400, "Minimum deposit amount is 1 USD");
    }

    const rateInfo = {
      from_currency: currency,
      to_currency: asset_code,
      amount: amount
    }

    let expectedAmount = 0
    const expectedRate: any = await this.getExchangeRate(rateInfo)
    if (expectedRate.status == 200 && expectedRate.data.rate) {
      const rate = expectedRate.data.rate
      expectedAmount = rate * amount
    } else {
      return this.makeResponse(400, "Failed to get exchange rate");
    }


    const stellarAddress = await blockchainHelper.getAddressFromDb(userId, chain_code)
    console.log("stableCoinDeposit-1", stellarAddress);

    if (!stellarAddress) {
      return this.makeResponse(400, "Failed to get deposit address");
    }

    // const transaction = await this.createTransactionRecord(userId, userId, "ADMIN", currency, expectedAmount, "deposit", "wallet", stellarAddress, "Deposit request", "", asset_code, amount);
    //  if (!transaction) {
    //    return this.makeResponse(400, "Failed to create transaction record");
    // }
    return this.makeResponse(200, "Deposit request sent", {
      address: stellarAddress,
      memo: refId,
      asset_code: asset_code
    })


  }

  async getDepositAddresses(userId: string) {
    try {
      return await blockchainHelper.getDepositAddresses(userId);
    } catch (error) {
      console.error('Error in getDepositAddresses:', error);
      return this.makeResponse(500, 'Error getting deposit addresses', null);
    }
  }



  async depositRequest(body: any) {
    const { userId, amount, currency, asset_code, account_number } = body;
    const usdIssuer = process.env.USD_ISSUER;
    const wallet = await this.getWallet(userId);
    if (!wallet) {
      return this.makeResponse(404, "Wallet not found");
    }




    const refId = "r" + this.getRandomString();
    const transaction = await this.createTransactionRecord(userId, userId, "ADMIN", currency, amount, "deposit", "wallet", refId, "Deposit request", account_number);
    if (!transaction) {
      return this.makeResponse(400, "Failed to create transaction record");
    }
    if (currency.toUpperCase() == "UGX") {
      const response = await MudaPayment.makeCollection(transaction.trans_id, amount, account_number);
      if (response.status == 202) {
        return this.makeResponse(202, "Deposit request sent");
      } else {
        return this.makeResponse(400, "Failed to send deposit request");
      }
      console.log("response", response);
    } else if (currency.toUpperCase() == "USD") {
      return {
        status: 200,
        message: "Deposit address generated",

      }
    } else {
      return this.makeResponse(400, "Payout is only supported in USD for conversion to UGX");
    }



  }


  async issueTokens(transId: string) {
    try {
      const transInfo = await this.selectDataQuery(`wl_transactions`, `trans_id='${transId}' and status='RECEIVED'`)

      if (transInfo.length == 0) {
        return this.makeResponse(404, "Transaction not found");
      }
      await this.updateData("wl_transactions", `trans_id='${transId}'`, { status: "INPROGRESS" });
      const userId = transInfo[0].user_id;
      // Get user wallet info
      const userInfo: any = await this.getWallet(userId);
      if (userInfo == null) {
        return { status: 404, message: "User wallet not found" };
      }

      const { publicKey, secret } = userInfo;

      // Create escrow transaction
      const transactionObject: Recipient = {
        publicKey: publicKey,
        amount: transInfo[0].amount.toString(),
        asset_code: transInfo[0].currency,
        asset_issuer: this.stellar.assetIssuer,
        senderSecretKey: this.stellar.assetIssuerPv || '',
        creditPrivateKey: secret,
      };
      console.log("transactionObject", transactionObject);

      // Process escrow payment
      const response = await this.stellar.makeBatchTransfers("deposit", [transactionObject]);
      console.log("response", response);

      if (response.status == 1) {

        this.sendAppNotification("GENERAL_CREDIT", userId, userId, transInfo[0].amount, transInfo[0].currency, "deposit", 0);


        this.updateData("wl_transactions", `trans_id='${transId}'`, { status: "SUCCESS" });
        return this.makeResponse(200, "Tokens issued successfully");
      } else {
        this.updateData("wl_transactions", `trans_id='${transId}'`, { status: "DEPOSIT_ERROR" });

        return this.makeResponse(400, "Failed to issue tokens");
      }


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
    try {
      console.log(`Getting balances for user ${userId}`);

      // Get user to get public key
      const user = await this.getWallet(userId);
      if (!user) {
        console.log(`User ${userId} not found`);
        return {
          status: 404,
          message: 'User not found'
        };
      }

      console.log("user11", user);
      const balances: any = await this.stellar.getBalances(user.publicKey);
      console.log("user12", balances);
      return {
        status: 200,
        message: 'Balances retrieved successfully',
        data: balances
      };

    } catch (error) {
      console.error('Get balances error:', error);
      return {
        status: 500,
        message: 'Failed to get balances'
      };
    }
  }
  async getBalance(data: any, token: string): Promise<any> {
    try {
      const { userId } = data;
      console.log(`Getting balance for user ${userId}`);

      // Get user to get public key
      const user = await this.getWallet(userId);
      if (!user) {
        console.log(`User ${userId} not found`);
        return {
          status: 404,
          message: 'User not found'
        };
      }
      console.log("user13", user);
      const balance = await this.stellar.getBalance(user.publicKey, token, this.stellar.assetIssuer);
      console.log("user14", balance);
      return {
        status: 200,
        message: 'Balance retrieved successfully',
        data: {
          balance: parseFloat(balance),
          token: token,
          issuer: this.stellar.assetIssuer

        }
      };


    } catch (error) {
      console.error('Get balance error:', error);
      return {
        status: 500,
        message: 'Failed to get balance'
      };
    }
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

      if (paymentMethod == "MOBILE_MONEY_MUDAPAY") {
        thirdpartyPayResponse = await MudaPayment.makePayout(transId, payout_amount, account_number);
      } else if (paymentMethod == "WALLET") {
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
    const receiverWallet = await this.getWallet(transaction.cr_wallet_id);

    const userInfo: any = await this.getWallet(transaction.dr_wallet_id);
    if (userInfo == null) {
      return { status: 404, message: "User wallet not found" };
    }

    const { publicKey, secret } = userInfo;

    const totalAmount = parseFloat(transaction.amount) + parseFloat(transaction.fee);

    // Create escrow transaction
    const transactionObject: Recipient = {
      publicKey: publicKey,
      amount: totalAmount.toString(),
      asset_code: transaction.currency,
      asset_issuer: this.stellar.assetIssuer,
      senderSecretKey: this.stellar.assetIssuerPv || '',
      creditPrivateKey: secret,
    };
    console.log("transactionObject", transactionObject);

    // Process escrow payment
    const response = await this.stellar.makeBatchTransfers("deposit", [transactionObject]);
    console.log("response", response);
    if (response.status == 1) {
      this.sendAppNotification("GENERAL_CREDIT", transaction.dr_wallet_id, transaction.cr_wallet_id, transaction.amount, transaction.currency, "deposit", 0);
      this.updateData("wl_transactions", `trans_id='${transaction.trans_id}'`, { status: "REVERSED" });
      return this.makeResponse(200, "Tokens issued successfully");
    } else {
      this.updateData("wl_transactions", `trans_id='${transaction.trans_id}'`, { status: "ON_HOLD" });
    }
    return this.makeResponse(400, "Transaction reversal failed");
  }

  async addPaymentMethod(data: any) {
    try {
      const { userId, type, currency, phone_number, country_code, network, account_name, bank_name, bank_code, account_number, bank_address, bank_phone_number, bank_country } = data;

      const user_id = userId

      const paymentMethods = await this.getPaymentTypes()
      const allowedPaymentMethods = paymentMethods.data
      if (!allowedPaymentMethods.includes(type)) {
        return this.makeResponse(400, "Invalid payment method");
      }



      // Validate input
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

  async transferRequest(data: any) {
    try {
      // Destructure and validate input data
      const {
        userId,
        currency,
        payment_mode,
        amount,
        pin,
        narration,
        payment_method_id
      } = data;
      console.log("transferRequest", data);

      // Initialize billerInfo at function scope
      let billerInfo: BillerInfo | null = null;

      console.log("transferRequest", data);
      // Validate amount
      if (parseFloat(amount) <= 10) {
        return this.makeResponse(400, "Invalid amount. Amount must be greater than 10");
      }

      let receiverPublicKey = this.stellar.assetIssuer || ""
      let receiverPvKey = this.stellar.assetIssuerPv || ""

      const senderWallet = await this.getWallet(userId);
      if (!senderWallet) {
        return this.makeResponse(404, "Sender wallet not found");
      }

      // Get allowed payment types
      const paymentType = await this.getPaymentType(payment_mode);
      if (!paymentType) {
        return this.makeResponse(400, "Invalid payment method");
      }
      const fee = paymentType.fee;
      console.log("fee==>1", fee, amount, paymentType);
      const totalAmount = parseFloat(amount) + parseFloat(fee);

      const balance = await this.stellar.getBalance(senderWallet.publicKey, currency, this.stellar.assetIssuer);
      console.log("fee==>2", balance, totalAmount);
      if (totalAmount > parseFloat(balance)) {
        return this.makeResponse(400, "Insufficient funds on your wallet, you need atleast " + totalAmount + " " + currency + " to complete this transaction");
      }



      let account_number = data.account_number || data.receiverId;
      const paymentMethod: any = await this.getUserPaymentMethod(payment_method_id);
      if (paymentMethod.length > 0) {
        account_number = paymentMethod[0].account_number;
      }
      console.log(`paymentMethod`, account_number, paymentMethod);
      const paymentMethodType = paymentMethod.type;
      if (paymentMethodType != payment_mode) {
        // return this.makeResponse(400, "Invalid payment method");
      }

      let recWallet = "1000010"
      let recUserId = account_number; // Default to receiverId if not a wallet transfer
      // Handle different payment methods
      if (payment_mode === 'WALLET') {
        recWallet = account_number
        // Validate receiver wallet address
        if (!account_number || typeof account_number !== 'string') {
          return this.makeResponse(400, "Invalid receiver wallet address");
        }
      } else if (payment_mode === 'MOBILE_MONEY') {
        // Validate phone number format
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(account_number)) {
          console.log(`Invalid phone number format`, account_number);
        }
      } else if (payment_mode === 'BILLER') {
        billerInfo = data.billerInfo as BillerInfo;
        const billerSlug = billerInfo.product_code
        const billerAccountNumber = billerInfo.account_number
        const billerValidationReference = billerInfo.validation_reference
        if (!billerValidationReference) {
          return this.makeResponse(400, "Biller validation reference is required");
        }

        if (!billerSlug || !billerAccountNumber) {
          return this.makeResponse(400, "Biller slug and account number are required");
        }

        const billerItem: any = await this.callQuery(`SELECT * FROM billers WHERE slug='${billerSlug}'`);
        if (billerItem.length == 0) {
          // return this.makeResponse(404, "Biller not found");
        }

      } else if (payment_mode === 'MERCHANT_KITI_PAY') {
        recWallet = data.merchant_id
        if (!account_number || typeof account_number !== 'string') {
          return this.makeResponse(400, "Invalid receiver wallet address");
        }

      } else if (payment_mode === 'MERCHANT_MOMO_PAY') {

      } else if (payment_mode === 'MERCHANT_AIRTEL_PAY') {

        return this.makeResponse(400, "Airtel pay is not supported yet");

      } else {
        return this.makeResponse(400, "Invalid payment method");
      }


      const receiverWallet: any = await this.getWallet(recWallet);

      if (!receiverWallet) {
        return this.makeResponse(404, "Receiver wallet not found");
      }
      recUserId = receiverWallet.user_id; // Use the user_id of the receiver's wallet

      receiverPublicKey = receiverWallet.publicKey;
      receiverPvKey = receiverWallet.secret;
      let receiverCurrency = receiverWallet.currency;
      let receiverAmount = amount;

      let conversionRate = 2;
      if (receiverCurrency != currency) {
        const rate = await paymentModel.getRate(receiverCurrency, currency);
        console.log(`rateInfo`, rate);
        receiverAmount = amount * rate.data.rate
        // conversionRate = await this.getConversionRate(receiverCurrency, currency);
      }


      // Validate PIN
      const isValidPin = await this.validatePin(userId, pin);
      if (isValidPin.status !== 200) {
        return isValidPin;
      }

      // Process the transfer
      const description = narration || "Transfer";

      const reference = this.getRandomString();
      //  const account_number = receiverId;

      const transaction = await this.createTransactionRecord(userId, senderWallet.user_id, recUserId, currency, amount, "transfer", payment_mode, reference, description, account_number, currency, amount, fee);

      if (!transaction) {
        return this.makeResponse(400, "Failed to create transaction record");
      }

      const drSame: Recipient = {
        publicKey: receiverPublicKey,
        amount: amount.toString(),
        asset_code: currency,
        asset_issuer: this.stellar.assetIssuer,
        senderSecretKey: senderWallet.secret,
        creditPrivateKey: receiverPvKey
      }

      const drDiff: Recipient = {
        publicKey: this.stellar.assetIssuer,
        amount: amount.toString(),
        asset_code: currency,
        asset_issuer: this.stellar.assetIssuer,
        senderSecretKey: senderWallet.secret,
        creditPrivateKey: senderWallet.secret
      }

      const crDiff: Recipient = {
        publicKey: receiverPublicKey,
        amount: receiverAmount.toString(),
        asset_code: receiverCurrency,
        asset_issuer: this.stellar.assetIssuer,
        senderSecretKey: this.stellar.assetIssuerPv,
        creditPrivateKey: receiverPvKey
      }

      let txArray: Recipient[] = []



      if (receiverCurrency != currency) {
        txArray = [drDiff, crDiff]
      } else {
        txArray = [drSame]
      }

      if (fee > 0) {
        const feeRecipient: Recipient = {
          publicKey: this.stellar.assetIssuer,
          amount: fee.toString(),
          asset_code: currency,
          asset_issuer: this.stellar.assetIssuer,
          senderSecretKey: senderWallet.secret,
          creditPrivateKey: senderWallet.secret
        }
        txArray.push(feeRecipient)
      }



      const response = await this.stellar.makeBatchTransfers("transfer", txArray);
      console.log(`response`, response);

      if (response.status == 1) {
        this.sendAppNotification("GENERAL_DEBIT", userId, account_number, receiverAmount, currency, payment_mode, fee);

        if (payment_mode === 'WALLET') {
          this.sendAppNotification("GENERAL_CREDIT", recUserId, userId, amount, currency, payment_mode, fee);
          await this.updateTransactionStatus(transaction.trans_id, "SUCCESS", reference);
          return this.makeResponse(200, "Transfer successful");
        } else {
          return await this.makeThirdpartyTransfer(transaction.trans_id, userId, amount, payment_mode, account_number, currency, receiverCurrency, description, reference, billerInfo);
        }
      } else {
        await this.updateData("wl_transactions", `trans_id='${transaction.trans_id}'`, { status: "FAILED" });
        return this.makeResponse(400, "Failed to initiate transfer, " + response.message);
      }

    } catch (error: any) {
      console.error('Transfer request error:', error);
      return {
        status: 500,
        message: error.message || 'Failed to process transfer request'
      };
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

      // If approved, credit tokens to user
      if (status === 'APPROVED') {
        const giveAirdrop = await this.giveAirdrop(task.user_id, task.reward, this.stellar.betToken);
        if (giveAirdrop.status == 200) {
          const updateObj = {
            status: "PAID",
          }
          await this.updateData("performed_tasks", `id='${performedTaskId}'`, updateObj);
        }

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