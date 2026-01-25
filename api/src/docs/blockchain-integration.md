# Multi-Chain Deposit Integration

This document describes the implementation of multi-chain deposits in the SiaBet platform, allowing users to deposit funds from Stellar, Tron, and Binance Smart Chain.

## Overview

The implementation consists of the following components:

1. **BlockchainHelper** - A utility class for managing blockchain addresses and operations
2. **BalanceSweeper** - A utility for checking balances and sweeping funds to central accounts
3. **Database Tables** - Tables for storing user blockchain addresses and sweep transactions
4. **API Endpoints** - Endpoints for retrieving deposit addresses and checking balances

## Environment Variables

The following environment variables need to be configured:

```
# Stellar Configuration
STELLAR_USDC_ISSUER=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
CENTRAL_STELLAR_ADDRESS=GDZKQW6IOV2C4...

# Tron Configuration
TRON_API_URL=https://api.trongrid.io
TRON_API_KEY=your-tron-api-key
TRON_USDT_CONTRACT=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
CENTRAL_TRON_ADDRESS=TJYeasTPa6gpEEiNGdifFcaKnw5YnTmZoz

# Binance Smart Chain Configuration
BSC_RPC_URL=https://bsc-dataseed.binance.org/
BSC_USDC_CONTRACT=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
CENTRAL_BINANCE_ADDRESS=0x742d35Cc6634C0532925a3b844Bc454e4438f44e

# Sweep Thresholds
STELLAR_USDC_SWEEP_THRESHOLD=10
TRON_USDT_SWEEP_THRESHOLD=10
BSC_USDC_SWEEP_THRESHOLD=10

# Security
ENCRYPTION_KEY=your-encryption-key-for-private-keys
```

## Database Schema

Two new tables are added to the database:

1. **user_blockchain_addresses** - Stores user addresses for different blockchains
2. **sweep_transactions** - Records sweep transactions from user addresses to central addresses

See the `migrations/blockchain_addresses.sql` file for the complete schema.

## API Endpoints

### GET /wallet/deposit/addresses

Returns deposit addresses for a user across multiple blockchains.

**Response:**
```json
{
  "status": 200,
  "message": "Deposit addresses retrieved successfully",
  "data": {
    "stellar": "GDZKQW6IOV2C4...",
    "tron": "TJYeasTPa6gpEEiNGdifFcaKnw5YnTmZoz",
    "binance": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
  }
}
```

## Balance Sweeping

The balance sweeper checks user addresses for balances above configured thresholds and sweeps the funds to central addresses. This helps to consolidate funds and reduce the risk of keeping large amounts in user addresses.

### Running the Sweeper

Run the sweeper script manually:

```bash
npm run sweep-balances
```

Or set up a cron job to run it periodically:

```
0 */6 * * * cd /path/to/siabet-web/api && npm run sweep-balances >> /var/log/siabet/sweep.log 2>&1
```

## Implementation Details

### Address Generation

- **Stellar**: Uses the existing wallet generation mechanism
- **Tron**: Creates a new Tron address using TronWeb
- **Binance Chain**: Creates a new Ethereum-compatible address using ethers.js

### Balance Checking

- **Stellar**: Uses the Stellar SDK to check balances
- **Tron**: Uses TronWeb to check TRX and USDT balances
- **Binance Chain**: Uses ethers.js to check BNB and USDC balances

### Sweeping Funds

- **Stellar**: Sends USDC to the central address
- **Tron**: Sends USDT to the central address
- **Binance Chain**: Sends USDC to the central address

## Security Considerations

1. **Private Key Storage**: All private keys are encrypted before being stored in the database
2. **Central Addresses**: Central addresses should be secure multisig wallets or hardware wallets
3. **Sweep Thresholds**: Configure sweep thresholds to balance security and gas costs

## Dependencies

- **ethers.js**: Ethereum library for Binance Smart Chain interactions
- **tronweb**: Tron library for Tron blockchain interactions
- **stellar-sdk**: Stellar library for Stellar blockchain interactions

## Installation

1. Install dependencies:
```bash
npm install ethers tronweb
```

2. Create the database tables:
```bash
mysql -u username -p database_name < src/migrations/blockchain_addresses.sql
```

3. Configure environment variables in `.env` file

4. Test the implementation:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/wallet/deposit/addresses
``` 