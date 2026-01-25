// moralisStreams.ts
import Moralis from 'moralis';
import { EvmChain } from '@moralisweb3/common-evm-utils';
import * as dotenv from 'dotenv';

dotenv.config();
const streamId = process.env.MORALIS_STREAM_ID || '94758b67-0946-4ee1-8e77-099dee62b469';

// Singleton pattern to prevent multiple initialization
let isMoralisInitialized = false;

async function initMoralis() {
  if (isMoralisInitialized) {
    console.log('Moralis already initialized, skipping...');
    return;
  }
  
  const apiKey = process.env.MORALIS_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImRhMDJhMjgwLTZiMDItNGQzYS1iYTk3LTMwMmYxZDJkY2YzZCIsIm9yZ0lkIjoiMTI1NjgwIiwidXNlcklkIjoiMTI1MzI2IiwidHlwZUlkIjoiMmViNGJkN2EtM2I5NS00NTVkLTg0MmUtNGNiNDYwYWE2Njk5IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MDkyOTUwNjAsImV4cCI6NDg2NTA1NTA2MH0.EoG2beCJP33_fGvbTLXJqBP1o4Z6qj9-QGUbpgx1AFI';
  if (!apiKey) {
    console.warn('MORALIS_API_KEY missing in .env - Moralis functionality will be disabled');
    isMoralisInitialized = true; // Mark as initialized to prevent retries
    return;
  }
  
  try {
    await Moralis.start({ apiKey });
    isMoralisInitialized = true;
    console.log('Moralis initialized successfully');
  } catch (error: any) {
    if (error.code === 'C0009') {
      // Already started, mark as initialized
      isMoralisInitialized = true;
      console.log('Moralis already started, continuing...');
    } else {
      console.error('Failed to initialize Moralis:', error);
      // Mark as initialized to prevent infinite retry loops
      isMoralisInitialized = true;
      console.warn('Moralis initialization failed - functionality will be disabled');
    }
  }
}

type Chainish = keyof typeof EvmChain | `${number}`; // e.g. "ETHEREUM" or "0x1"

export async function createStream(
  tag: string,
  chains: Chainish[],
  description = 'Demo stream',
) {
  await initMoralis();
  const stream :any = await Moralis.Streams.add({
    webhookUrl: process.env.WEBHOOK_URL!,
    description,
    tag,
    chains: chains.map((c) => (typeof c === 'string' && c.startsWith('0x')
      ? c
      :
        EvmChain[c])),
    includeContractLogs: true, // listen to both tx + event logs
    abi: undefined,           // put an ABI array here if you only need specific events
  });

  console.log(`✅  Stream created: ${stream.id}`);
  return stream.id;
}

export async function getStreams(limit = 25) {
  await initMoralis();
  const { result } = await Moralis.Streams.getAll({ limit });
  console.log('📜  Existing streams:', result.map((s) => ({
    id: s.id,
    tag: s.tag,
    chains: s.chains,
  })));
  return result;
}

export async function addAddressesToStream(addresses: string[]) {
  await initMoralis();
  
  // Filter out non-EVM addresses (like Tron addresses that start with 'T')
  const evmAddresses = addresses.filter(address => {
    // EVM addresses should start with '0x' and be 42 characters long
    // Tron addresses start with 'T' and are typically 34 characters long
    return address.startsWith('0x') && address.length === 42;
  });
  
  if (evmAddresses.length === 0) {
    console.log(`⚠️  No EVM addresses found in the provided addresses. Skipping Moralis stream addition.`);
    return { status: 'skipped', message: 'No EVM addresses to add' };
  }
  
  if (evmAddresses.length < addresses.length) {
    const nonEvmAddresses = addresses.filter(addr => !addr.startsWith('0x') || addr.length !== 42);
    console.log(`⚠️  Filtered out non-EVM addresses: ${nonEvmAddresses.join(', ')}`);
  }
  
  try {
    const responseData = await Moralis.Streams.addAddress({ id: streamId, address: evmAddresses });
    console.log(`➕ Added ${evmAddresses.length} EVM address(es) to stream ${streamId}`, responseData);
    return responseData;
  } catch (error) {
    console.error(`❌ Error adding addresses to Moralis stream:`, error);
    throw error;
  }
}

export async function removeAddressesFromStream(streamId: string, addresses: string[]) {
  await initMoralis();
  await Moralis.Streams.deleteAddress({ id: streamId, address: addresses });
  console.log(`➖  Removed ${addresses.length} address(es) from stream ${streamId}`);
}

export async function deleteStream(streamId: string) {
  await initMoralis();
  await Moralis.Streams.delete({ id: streamId });
  console.log(`🗑️  Deleted stream ${streamId}`);
}
 
