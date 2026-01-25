# Moralis Address Validation Fix

## Problem
The system was locking up when Tron addresses (starting with 'T') were passed to Moralis for validation. Moralis only supports EVM-compatible addresses, but the code was trying to add Tron addresses to Moralis streams, causing validation errors that would crash the system.

## Error Message
```
Moralis SDK Core Error: [C0005] Invalid address provided: T7d680971e66a9a5774cc51283082c32213951497
```

## Solution
Implemented address filtering in the `addAddressesToStream` function to:

1. **Filter out non-EVM addresses** before sending to Moralis
2. **Add error handling** to prevent system lockups
3. **Log filtered addresses** for debugging purposes

## Changes Made

### 1. Updated `src/thirdparty/Moralis.ts`
- Added address filtering logic to only send EVM addresses (starting with '0x' and 42 characters long)
- Added comprehensive error handling
- Added logging for filtered addresses

### 2. Updated `src/libs/blockchain.simple.ts`
- Added conditional logic to only call `addAddressesToStream` for EVM addresses
- Added error handling to prevent wallet creation failures

### 3. Updated `full-blockchain-tracker/api/src/services/Moralis.ts`
- Applied the same filtering logic to the full-blockchain-tracker project

### 4. Updated `full-blockchain-tracker/api/src/models/tracked-address.ts`
- Added error handling around Moralis calls

## Address Format Validation
- **EVM addresses**: Start with '0x' and are 42 characters long
- **Tron addresses**: Start with 'T' and are typically 34 characters long
- **Other blockchains**: May have different formats

## Testing
Use the test script `test-moralis-fix.js` to verify the fix works correctly.

## Impact
- ✅ Prevents system lockups when Tron addresses are encountered
- ✅ Maintains functionality for EVM addresses
- ✅ Provides clear logging for debugging
- ✅ Graceful degradation when Moralis is unavailable

## Files Modified
- `siabet-web/api/src/thirdparty/Moralis.ts`
- `siabet-web/api/src/libs/blockchain.simple.ts`
- `full-blockchain-tracker/api/src/services/Moralis.ts`
- `full-blockchain-tracker/api/src/models/tracked-address.ts`
- `siabet-web/api/src/models/Wallet.ts` (documentation) 