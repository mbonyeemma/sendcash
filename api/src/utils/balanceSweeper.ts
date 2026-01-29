import { BlockchainHelper } from '../libs/blockchain';
import * as db from '../libs/db.helper';
import * as TronWeb from 'tronweb';
import { ethers } from 'ethers';
import crypto from 'crypto';

/** XRPL-only: BalanceSweeper stubbed; no Stellar sweeping. */
export class BalanceSweeper {
  private blockchainHelper: BlockchainHelper;
  private tronWeb: any;
  private binanceProvider: any;
  private centralAddresses = {
    stellar: '',
    tron: process.env.CENTRAL_TRON_ADDRESS || '',
    binance: process.env.CENTRAL_BINANCE_ADDRESS || ''
  };
  private sweepThresholds = {
    stellar: { USDC: 10 },
    tron: { USDT: parseFloat(process.env.TRON_USDT_SWEEP_THRESHOLD || '10') },
    binance: { USDC: parseFloat(process.env.BSC_USDC_SWEEP_THRESHOLD || '10') }
  };

  constructor() {
    this.blockchainHelper = new BlockchainHelper();
    this.tronWeb = new TronWeb({
      fullHost: process.env.TRON_API_URL || 'https://api.trongrid.io',
      headers: { "TRON-PRO-API-KEY": process.env.TRON_API_KEY },
    });
    const RpcProvider: any = (ethers as any).providers?.JsonRpcProvider ?? (ethers as any).JsonRpcProvider;
    this.binanceProvider = new RpcProvider(process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/');
  }
  
  /**
   * Check balances for all user addresses and sweep if above threshold
   */
  async checkAndSweepBalances(): Promise<any> {
    try {
      const results = {
        stellar: { swept: 0, message: 'XRPL-only: Stellar sweeping disabled' },
        tron: await this.checkAndSweepTron(),
        binance: await this.checkAndSweepBinance()
      };
      
      return {
        status: 200,
        message: "Balance check and sweep completed",
        data: results
      };
    } catch (error) {
      console.error("Error in checkAndSweepBalances:", error);
      return {
        status: 500,
        message: "Error checking and sweeping balances",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Check and sweep Stellar balances (XRPL-only: disabled)
   */
  private async checkAndSweepStellar(): Promise<any> {
    return { swept: 0, message: 'XRPL-only' };
  }

  /**
   * Check and sweep Tron balances
   */
  private async checkAndSweepTron(): Promise<any> {
    try {
      // Get all Tron addresses
      const query = `SELECT * FROM user_blockchain_addresses WHERE chain = 'tron'`;
      const addresses :any = await db.default.pdo(query);
      
      const results = [];
      
      for (const addr of addresses) {
        try {
          // Check balance
          const balanceResult = await this.blockchainHelper.checkBalance('tron', addr.address);
          
          if (balanceResult.status === 200 && balanceResult.data) {
            const balances = balanceResult.data;
            
            if (balances.USDT >= this.sweepThresholds.tron.USDT) {
              // Decrypt private key
              const privateKey = this.decryptPrivateKey(addr.private_key);
              
              // Sweep the funds
              const sweepResult = await this.sweepTronFunds(
                addr.address,
                privateKey,
                this.centralAddresses.tron,
                balances.USDT
              );
              
              results.push({
                address: addr.address,
                balance: balances.USDT,
                swept: true,
                result: sweepResult
              });
              
              // Record the sweep in the database
              await this.recordSweep(
                addr.user_id,
                'tron',
                addr.address,
                this.centralAddresses.tron,
                balances.USDT,
                'USDT'
              );
            } else {
              results.push({
                address: addr.address,
                balance: balances.USDT,
                swept: false,
                reason: 'Balance below threshold'
              });
            }
          }
        } catch (error) {
          console.error(`Error processing Tron address ${addr.address}:`, error);
          results.push({
            address: addr.address,
            swept: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error("Error in checkAndSweepTron:", error);
      return {
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Check and sweep Binance Chain balances
   */
  private async checkAndSweepBinance(): Promise<any> {
    try {
      // Get all Binance Chain addresses
      const query = `SELECT * FROM user_blockchain_addresses WHERE chain = 'binance'`;
      const addresses:any = await db.default.pdo(query);
      
      const results = [];
      
      for (const addr of addresses) {
        try {
          // Check balance
          const balanceResult = await this.blockchainHelper.checkBalance('binance', addr.address);
          
          if (balanceResult.status === 200 && balanceResult.data) {
            const balances = balanceResult.data;
            
            if (parseFloat(balances.USDC) >= this.sweepThresholds.binance.USDC) {
              // Decrypt private key
              const privateKey = this.decryptPrivateKey(addr.private_key);
              
              // Sweep the funds
              const sweepResult = await this.sweepBinanceFunds(
                addr.address,
                privateKey,
                this.centralAddresses.binance,
                balances.USDC
              );
              
              results.push({
                address: addr.address,
                balance: balances.USDC,
                swept: true,
                result: sweepResult
              });
              
              // Record the sweep in the database
              await this.recordSweep(
                addr.user_id,
                'binance',
                addr.address,
                this.centralAddresses.binance,
                parseFloat(balances.USDC),
                'USDC'
              );
            } else {
              results.push({
                address: addr.address,
                balance: balances.USDC,
                swept: false,
                reason: 'Balance below threshold'
              });
            }
          }
        } catch (error) {
          console.error(`Error processing Binance address ${addr.address}:`, error);
          results.push({
            address: addr.address,
            swept: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error("Error in checkAndSweepBinance:", error);
      return {
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /** XRPL-only: Stellar sweeping disabled */
  private async sweepStellarFunds(
    _fromAddress: string,
    _secretKey: string,
    _toAddress: string,
    _amount: string,
    _assetCode: string,
    _assetIssuer: string
  ): Promise<any> {
    return { status: 400, message: 'XRPL-only: Stellar sweeping disabled' };
  }
  
  /**
   * Sweep Tron USDT funds to central address
   */
  private async sweepTronFunds(
    fromAddress: string,
    privateKey: string,
    toAddress: string,
    amount: number
  ): Promise<any> {
    try {
      // Set the private key for the transaction
      this.tronWeb.setPrivateKey(privateKey);
      
      const usdtContract = process.env.TRON_USDT_CONTRACT;
      if (!usdtContract) {
        throw new Error("TRON_USDT_CONTRACT not configured");
      }
      
      // Get the contract instance
      const contract = await this.tronWeb.contract().at(usdtContract);
      
      // Convert amount to contract decimals (6 for USDT)
      const amountInDecimals = this.tronWeb.toSun(amount.toString()) / 1e12;
      
      // Send the transaction
      const transaction = await contract.transfer(toAddress, amountInDecimals).send();
      
      return {
        status: 200,
        message: "Funds swept successfully",
        data: {
          transactionHash: transaction
        }
      };
    } catch (error) {
      console.error("Error sweeping Tron funds:", error);
      throw error;
    }
  }
  
  /**
   * Sweep Binance Chain USDC funds to central address
   */
  private async sweepBinanceFunds(
    fromAddress: string,
    privateKey: string,
    toAddress: string,
    amount: string
  ): Promise<any> {
    try {
      // Create wallet with private key
      const wallet = new ethers.Wallet(privateKey, this.binanceProvider);
      
      const usdcContract = process.env.BSC_USDC_CONTRACT;
      if (!usdcContract) {
        throw new Error("BSC_USDC_CONTRACT not configured");
      }
      
      // USDC ABI for transfer function
      const abi = [
        "function transfer(address to, uint256 value) returns (bool)",
        "function balanceOf(address owner) view returns (uint256)"
      ];
      
      // Create contract instance
      const contract = new ethers.Contract(usdcContract, abi, wallet);
      
      // Convert amount to contract decimals (18 for USDC on BSC)
      const amountInDecimals = "3" //ethers.parseUnits(amount, 18);
      
      // Send the transaction
      const tx = await contract.transfer(toAddress, amountInDecimals);
      const receipt = await tx.wait();
      
      return {
        status: 200,
        message: "Funds swept successfully",
        data: {
          transactionHash: receipt.transactionHash
        }
      };
    } catch (error) {
      console.error("Error sweeping Binance funds:", error);
      throw error;
    }
  }
  
  /**
   * Record a sweep transaction in the database
   */
  private async recordSweep(
    userId: string,
    chain: string,
    fromAddress: string,
    toAddress: string,
    amount: number,
    token: string
  ): Promise<void> {
    try {
      const insertQuery = `
        INSERT INTO sweep_transactions (
          user_id, chain, from_address, to_address, amount, token, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `;
      
      await db.default.pdo(insertQuery, [
        userId,
        chain,
        fromAddress,
        toAddress,
        amount,
        token
      ]);
    } catch (error) {
      console.error("Error recording sweep transaction:", error);
      // Don't throw, just log the error
    }
  }
  
  /**
   * Decrypt an encrypted private key
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