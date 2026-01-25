import dotenv from 'dotenv';
import path from 'path';
import { BlockchainHelper } from '../libs/blockchain';
import { Wallet } from '../models/Wallet';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testGetDepositAddresses() {
  try {
    console.log('Testing getDepositAddresses from BlockchainHelper...');
    const helper = new BlockchainHelper();
    const userId = '1'; // Test user ID as string
    const addresses = await helper.getDepositAddresses(userId);
    console.log('Deposit addresses:', JSON.stringify(addresses, null, 2));
    return addresses;
  } catch (error) {
    console.error('Error testing getDepositAddresses:', error);
    throw error;
  }
}

async function testWalletModelGetDepositAddresses() {
  try {
    console.log('Testing getDepositAddresses from Wallet model...');
    const wallet = new Wallet();
    const userId = '1'; // Test user ID as string
    const result = await wallet.getDepositAddresses(userId);
    console.log('Wallet model result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error testing Wallet.getDepositAddresses:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('Starting blockchain integration tests...');
    
    // Test BlockchainHelper
    await testGetDepositAddresses();
    
    // Test Wallet model
    await testWalletModelGetDepositAddresses();
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
main(); 