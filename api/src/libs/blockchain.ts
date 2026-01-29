import * as db from './db.helper';
const TronWeb = require('tronweb');
import { ethers } from 'ethers';
import crypto from 'crypto';

/** XRPL-only: BlockchainHelper stubbed; no Stellar/Tron/BSC for deposit addresses. */
export class BlockchainHelper {
  private tronWeb: any;
  private binanceProvider: any;

  constructor() {
    const tronApiUrl = process.env.TRON_API_URL || 'https://api.trongrid.io';
    const tronApiKey = process.env.TRON_API_KEY || '';
    this.tronWeb = new TronWeb({
      fullHost: tronApiUrl,
      headers: { "TRON-PRO-API-KEY": tronApiKey },
    });
    const bscRpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
    const JsonRpc = (ethers as any).providers?.JsonRpcProvider ?? (ethers as any).JsonRpcProvider;
    this.binanceProvider = new JsonRpc(bscRpcUrl);
  }

  async getDepositAddresses(userId: string): Promise<any> {
    return {
      status: 200,
      message: "XRPL-only: use your own XRPL address for onramp",
      data: { stellar: '', tron: '', binance: '' }
    };
  }

  async getStellarWallet(_userId: string): Promise<any> {
    return { publicKey: '' };
  }
  
  /**
   * Get or create a Tron address for a user
   * @param userId User ID
   * @returns Tron address
   */
  async getTronAddress(userId: string): Promise<string> {
    try {
      // Check if user already has a Tron address
      const query = `SELECT address FROM user_blockchain_addresses WHERE user_id = ? AND chain = 'tron'`;
      const result = await db.default.pdo(query, [userId]) as any[];
      
      if (result && result.length > 0) {
        return result[0].address;
      }
      
      // If no address exists, create a new one
      const account = await this.tronWeb.createAccount();
      const address = account.address.base58;
      const privateKey = account.privateKey;
      
      // Store the new address in the database
      const insertQuery = `
        INSERT INTO user_blockchain_addresses (user_id, chain, address, private_key, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `;
      
      await db.default.pdo(insertQuery, [
        userId,
        'tron',
        address,
        this.encryptPrivateKey(privateKey)
      ]);
      
      return address;
    } catch (error) {
      console.error("Error in getTronAddress:", error);
      // Return a placeholder address if there's an error
      return 'TJYeasTPa6gpEEiNGdifFcaKnw5YnTmZoz';
    }
  }
  
  /**
   * Get or create a Binance Chain address for a user
   * @param userId User ID
   * @returns Binance Chain address
   */
  async getBinanceAddress(userId: string): Promise<string> {
    try {
      // Check if user already has a Binance Chain address
      const query = `SELECT address FROM user_blockchain_addresses WHERE user_id = ? AND chain = 'binance'`;
      const result = await db.default.pdo(query, [userId]) as any[];
      
      if (result && result.length > 0) {
        return result[0].address;
      }
      
      // If no address exists, create a new one
      const wallet = ethers.Wallet.createRandom();
      const address = wallet.address;
      const privateKey = wallet.privateKey;
      
      // Store the new address in the database
      const insertQuery = `
        INSERT INTO user_blockchain_addresses (user_id, chain, address, private_key, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `;
      
      await db.default.pdo(insertQuery, [
        userId,
        'binance',
        address,
        this.encryptPrivateKey(privateKey)
      ]);
      
      return address;
    } catch (error) {
      console.error("Error in getBinanceAddress:", error);
      // Return a placeholder address if there's an error
      return '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
    }
  }
  
  /**
   * Check balance for a given address on a specific blockchain
   * @param chain Blockchain name (stellar, tron, binance)
   * @param address Address to check
   * @returns Balance information
   */
  async checkBalance(chain: string, address: string): Promise<any> {
    try {
      switch (chain.toLowerCase()) {
        case 'stellar':
          return { status: 200, message: "XRPL-only", data: [] };
        case 'tron':
          return await this.checkTronBalance(address);
        case 'binance':
          return await this.checkBinanceBalance(address);
        default:
          throw new Error(`Unsupported blockchain: ${chain}`);
      }
    } catch (error) {
      console.error(`Error checking ${chain} balance:`, error);
      return {
        status: 500,
        message: `Error checking ${chain} balance`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Check balance for a Tron address
   * @param address Tron address
   * @returns Balance information
   */
  private async checkTronBalance(address: string): Promise<any> {
    try {
      const balance = await this.tronWeb.trx.getBalance(address);
      const usdtContract = process.env.TRON_USDT_CONTRACT;
      
      let usdtBalance = 0;
      if (usdtContract) {
        const contract = await this.tronWeb.contract().at(usdtContract);
        const rawBalance = await contract.balanceOf(address).call();
        // Convert to number safely
        usdtBalance = parseFloat(this.tronWeb.toDecimal(rawBalance)) / 1e6; // USDT has 6 decimals
      }
      
      return {
        status: 200,
        message: "Balance retrieved successfully",
        data: {
          trx: balance / 1e6, // TRX has 6 decimals
          usdt: usdtBalance
        }
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Check balance for a Binance Chain address
   * @param address Binance Chain address
   * @returns Balance information
   */
  private async checkBinanceBalance(address: string): Promise<any> {
    try {
      const balance = await this.binanceProvider.getBalance(address);
      const usdcContract = process.env.BSC_USDC_CONTRACT;
      
      let usdcBalance = "0";
      if (usdcContract) {
        // USDC ABI for balanceOf function
        const abi = ["function balanceOf(address owner) view returns (uint256)"];
        const contract = new ethers.Contract(usdcContract, abi, this.binanceProvider);
        const rawBalance = await contract.balanceOf(address);
        usdcBalance = ethers.utils.formatUnits(rawBalance, 18); // USDC has 18 decimals on BSC
      }
      
      return {
        status: 200,
        message: "Balance retrieved successfully",
        data: {
          BNB: ethers.utils.formatEther(balance),
          USDC: usdcBalance
        }
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Encrypt a private key
   * @param privateKey The private key to encrypt
   * @returns Encrypted private key
   */
  private encryptPrivateKey(privateKey: string): string {
    try {
      const algorithm = 'aes-256-ctr';
      const secretKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv(algorithm, secretKey.slice(0, 32), iv);
      const encrypted = Buffer.concat([cipher.update(privateKey), cipher.final()]);
      
      return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (error) {
      console.error("Error encrypting private key:", error);
      throw error;
    }
  }
  
  /**
   * Decrypt an encrypted private key
   * @param encryptedKey The encrypted private key
   * @returns Decrypted private key
   */
  private decryptPrivateKey(encryptedKey: string): string {
    try {
      const algorithm = 'aes-256-ctr';
      const secretKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
      
      const [ivHex, encryptedHex] = encryptedKey.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const encryptedText = Buffer.from(encryptedHex, 'hex');
      
      const decipher = crypto.createDecipheriv(algorithm, secretKey.slice(0, 32), iv);
      const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
      
      return decrypted.toString();
    } catch (error) {
      console.error("Error decrypting private key:", error);
      throw error;
    }
  }
} 