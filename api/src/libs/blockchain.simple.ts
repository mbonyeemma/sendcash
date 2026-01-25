/**
 * Simplified blockchain helper for multi-chain deposits
 * This is a temporary solution until we can properly integrate with TypeScript
 */

import * as db from './db.helper';
import crypto from 'crypto';
import Wallets from '../helpers/walletTracker';
import { addAddressesToStream } from '../thirdparty/Moralis';

export class BlockchainHelper {
  async getSupportedAssets() {
    const assets = await db.default.pdo(`SELECT * FROM supported_assets s INNER JOIN chains c on s.chain_code=c.chain_code`);
    return assets;
  }
  async getChains(asset_code: any) {
    const chain = await db.default.pdo(`SELECT * FROM supported_assets WHERE asset_code = '${asset_code}'`);
    return chain;
  }
  constructor() {
    // No initialization needed for simplified version
  }

  /**
   * Get deposit addresses for a user across multiple blockchains
   * @param userId User ID
   * @returns Object containing addresses for different blockchains
   */
  async getDepositAddresses(userId: string): Promise<any> {
    try {
      // Get the addresses from database or use placeholders
      const stellarAddress = await this.getAddressFromDb(userId, 'stellar')
      const tronAddress = await this.getAddressFromDb(userId, 'tron')
      const binanceAddress = await this.getAddressFromDb(userId, 'bsc')
      return {
        status: 200,
        message: "Deposit addresses retrieved successfully",
        data: {
          stellar: stellarAddress,
          tron: tronAddress,
          binance: binanceAddress
        }
      };
    } catch (error) {
      console.error("Error in getDepositAddresses:", error);
      return {
        status: 500,
        message: "Error getting deposit addresses",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get address from database
   * @param userId User ID
   * @param chain Blockchain name
   * @returns Address or null if not found
   */
  async getAddressFromDb(userId: string, chain: string = 'bsc'): Promise<string | null> {
    try {
      // For Stellar, check the wallets table
      if (chain === 'stellar') {
        const query = `SELECT publicKey FROM sia_wallets	 WHERE user_id = ? AND chain = 'stellar'`;
        const result = await db.default.pdo(query, [userId]) as any[];

        if (result && result.length > 0) {
          return result[0].publicKey;
        }
        return null;
      }

      // For other chains, check the user_blockchain_addresses table
      const query = `SELECT address FROM user_blockchain_addresses WHERE user_id = ? AND chain = ?`;
      const result = await db.default.pdo(query, [userId, chain]) as any[];

      if (result && result.length > 0) {
        return result[0].address;
      }
      return await this.generateWallet(userId, chain); // Generate wallet if not found
    } catch (error) {
      console.error(`Error getting ${chain} address:`, error);
      return null;
    }
  }

  async generateWallet(userId: string, chain: string) {
    try {
      const response = await Wallets.createWallet(userId, chain);
      console.log("Wallet creation response:", response);

      const addAddress = response.data?.address || "";
      const privateKey = response.data?.privateKey;
      
      // Only try to add EVM addresses to Moralis stream
      if (addAddress && addAddress.startsWith('0x')) {
        try {
          await addAddressesToStream([addAddress]);
        } catch (moralisError) {
          console.warn(`⚠️  Failed to add address to Moralis stream (non-critical):`, moralisError);
          // Don't fail the wallet creation if Moralis fails
        }
      } else {
        console.log(`ℹ️  Skipping Moralis stream addition for non-EVM address: ${addAddress}`);
      }
      
      // Fetch wallets from the database
      const insertQuery = `
        INSERT INTO user_blockchain_addresses (user_id, chain, address, private_key, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `;

      await db.default.pdo(insertQuery, [
        userId,
        chain,
        addAddress,
        this.encryptPrivateKey(privateKey)
      ]);
      return addAddress;

    } catch (error) {
      console.error(`Error generating ${chain} wallet:`, error);
      return ""
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
      const encrypted = Buffer.concat([cipher.update(Buffer.from(privateKey)), cipher.final()]);

      return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (error) {
      console.error("Error encrypting private key:", error);
      throw error;
    }
  }
} 