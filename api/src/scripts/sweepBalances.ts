import { BalanceSweeper } from '../utils/balanceSweeper';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

/**
 * Script to sweep balances from user addresses to central addresses
 */
async function main() {
  try {
    console.log('Starting balance sweep process...');
    
    // Create a log directory if it doesn't exist
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Initialize the balance sweeper
    const balanceSweeper = new BalanceSweeper();
    
    // Run the sweep process
    const result = await balanceSweeper.checkAndSweepBalances();
    
    // Log the results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(logDir, `sweep-${timestamp}.json`);
    
    fs.writeFileSync(logFile, JSON.stringify(result, null, 2));
    
    console.log(`Sweep process completed. Results saved to ${logFile}`);
    
    // Log summary
    const stellar = result.data.stellar || [];
    const tron = result.data.tron || [];
    const binance = result.data.binance || [];
    
    const stellarSwept = stellar.filter((r: any) => r.swept).length;
    const tronSwept = tron.filter((r: any) => r.swept).length;
    const binanceSwept = binance.filter((r: any) => r.swept).length;
    
    console.log('Summary:');
    console.log(`- Stellar: ${stellarSwept}/${stellar.length} addresses swept`);
    console.log(`- Tron: ${tronSwept}/${tron.length} addresses swept`);
    console.log(`- Binance: ${binanceSwept}/${binance.length} addresses swept`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error in balance sweep process:', error);
    
    // Log the error
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(logDir, `sweep-error-${timestamp}.txt`);
    
    fs.writeFileSync(logFile, String(error));
    
    console.error(`Error logged to ${logFile}`);
    process.exit(1);
  }
}

// Execute the main function
main(); 