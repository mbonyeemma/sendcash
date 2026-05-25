/**
 * Hard-coded supported crypto assets (name, code, contract/issuer, chain).
 * Use these for dropdowns and labels instead of hardcoding a single currency.
 */

export type AssetChain = "base" | "xrpl";

export interface SupportedAsset {
  id: string;
  name: string;
  /** Ticker shown in UI (e.g. USDC, RLUSD, XRP) */
  code: string;
  /** EVM token contract on Base, or XRPL issuer for issued tokens; null for native XRP */
  contractAddress: string | null;
  chain: AssetChain;
  decimals: number;
  /** Key into `exchangeRates` in currencies.ts */
  rateKey: string;
  logo?: string;
  /** Mobile-money offramp is implemented for RLUSD on XRPL only (backend rlusdPayoutRequest). */
  supportsFiatOfframp: boolean;
}

const RLUSD_ISSUER = import.meta.env.VITE_RLUSD_ISSUER || "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";

/** Canonical USDC on Base mainnet */
export const BASE_USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
/** USDT on Base mainnet (bridged) */
export const BASE_USDT_CONTRACT = "0xfde4C96c8593536E31F229EA8f37b2AD310E2B67";

/** Order: USDC Base, RLUSD, XRP, USDT Base */
export const SUPPORTED_ASSETS: SupportedAsset[] = [
  {
    id: "usdc-base",
    name: "USD Coin",
    code: "USDC",
    contractAddress: BASE_USDC_CONTRACT,
    chain: "base",
    decimals: 6,
    rateKey: "usdc-base",
    logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=040",
    supportsFiatOfframp: false,
  },
  {
    id: "rlusd-xrpl",
    name: "Ripple USD",
    code: "RLUSD",
    contractAddress: RLUSD_ISSUER,
    chain: "xrpl",
    decimals: 6,
    rateKey: "rlusd",
    logo: "https://cryptologos.cc/logos/xrp-xrp-logo.png?v=040",
    supportsFiatOfframp: true,
  },
  {
    id: "xrp-xrpl",
    name: "XRP",
    code: "XRP",
    contractAddress: null,
    chain: "xrpl",
    decimals: 6,
    rateKey: "xrp",
    logo: "https://cryptologos.cc/logos/xrp-xrp-logo.png?v=040",
    supportsFiatOfframp: false,
  },
  {
    id: "usdt-base",
    name: "Tether USD",
    code: "USDT",
    contractAddress: BASE_USDT_CONTRACT,
    chain: "base",
    decimals: 6,
    rateKey: "usdt-base",
    logo: "https://cryptologos.cc/logos/tether-usdt-logo.png?v=040",
    supportsFiatOfframp: false,
  },
];

export function getSupportedAssetById(id: string): SupportedAsset | undefined {
  return SUPPORTED_ASSETS.find((a) => a.id === id);
}

export const XRPL_SEND_ASSETS = SUPPORTED_ASSETS.filter((a) => a.chain === "xrpl");

export const BASE_EVM_ASSETS = SUPPORTED_ASSETS.filter((a) => a.chain === "base");

/** Assets that can be used for fiat offramp (mobile money) with current backend */
export const FIAT_OFFRAMP_ASSETS = SUPPORTED_ASSETS.filter((a) => a.supportsFiatOfframp);
