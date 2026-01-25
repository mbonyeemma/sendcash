# Multi-Chain Deposit Feature

This feature allows users to deposit funds using multiple blockchain networks:
- Stellar (USDC)
- Tron (USDT)
- Binance Smart Chain (USDC)

## Installation

1. Install the required dependencies:

```bash
npm install crypto-js@4.1.1 dotenv@16.3.1 node-cron@3.0.3
```

2. Create the database tables:

```bash
mysql -u username -p database_name < src/migrations/blockchain_addresses.sql
```

3. Configure environment variables in `.env`:

```
# Stellar Configuration
STELLAR_USDC_ISSUER=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
CENTRAL_STELLAR_ADDRESS=your_central_stellar_address

# Security
ENCRYPTION_KEY=your_secure_encryption_key_32_chars
```

## Usage

### Backend

The feature is implemented using the following components:

- `BlockchainHelper` class in `src/libs/blockchain.simple.ts`
- `Wallet` model in `src/models/Wallet.ts`
- API endpoint at `GET /wallet/deposit/addresses`

### Frontend

For the Expo app:

1. Install the required dependencies:

```bash
cd ../expoapp
npm install react-native-qrcode-svg expo-clipboard
```

2. Use the `MultiChainDeposit` component in `expoapp/components/wallet/MultiChainDeposit.tsx`

## Testing

Run the test script to verify the implementation:

```bash
npm run test-blockchain
```

## Documentation

For more detailed information, see:

- `api/src/docs/blockchain-integration.md`
- `api/src/docs/implementation-summary.md` 