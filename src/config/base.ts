/**
 * Base L2 chain configuration.
 * Override contract addresses via VITE_BASE_USDC_CONTRACT / VITE_BASE_USDT_CONTRACT in .env
 */
export const BASE_CHAIN_ID = 8453;
export const BASE_CHAIN_ID_HEX = "0x2105";
export const BASE_RPC_URL = "https://mainnet.base.org";
export const BASE_EXPLORER = "https://basescan.org";
export const USDC_DECIMALS = 6;
export const USDT_DECIMALS = 6;

export const BASE_USDC_CONTRACT =
  import.meta.env.VITE_BASE_USDC_CONTRACT || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const BASE_USDT_CONTRACT =
  import.meta.env.VITE_BASE_USDT_CONTRACT || "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";

export const BASE_CHAIN_PARAMS = {
  chainId: BASE_CHAIN_ID_HEX,
  chainName: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: [BASE_RPC_URL],
  blockExplorerUrls: [BASE_EXPLORER],
};
