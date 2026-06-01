/**
 * Hard-coded supported crypto assets (name, code, contract/issuer, chain).
 * Cash-In / Cash-Out: pick network first, then asset from that network's allow-list.
 */

export type AssetChain = "base" | "xrpl";

export interface SupportedAsset {
  id: string;
  name: string;
  code: string;
  contractAddress: string | null;
  chain: AssetChain;
  decimals: number;
  rateKey: string;
  logo?: string;
  supportsFiatOfframp: boolean;
  supportsFiatOnramp: boolean;
}

export interface NetworkOption {
  id: AssetChain;
  label: string;
}

export const CASH_NETWORKS: NetworkOption[] = [
  { id: "base", label: "Base" },
  { id: "xrpl", label: "XRP" },
];

/** Allowed assets per network for mobile-money cash-in / cash-out */
export const CASH_ASSETS_BY_NETWORK: Record<AssetChain, string[]> = {
  base: ["usdc-base", "usdt-base"],
  xrpl: ["rlusd-xrpl"],
};

const RLUSD_ISSUER = import.meta.env.VITE_RLUSD_ISSUER || "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";

import { BASE_USDC_CONTRACT, BASE_USDT_CONTRACT } from "@/config/base";
export { BASE_USDC_CONTRACT, BASE_USDT_CONTRACT };

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
    supportsFiatOfframp: true,
    supportsFiatOnramp: true,
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
    supportsFiatOfframp: true,
    supportsFiatOnramp: true,
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
    supportsFiatOnramp: true,
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
    supportsFiatOnramp: false,
  },
];

export function getSupportedAssetById(id: string): SupportedAsset | undefined {
  return SUPPORTED_ASSETS.find((a) => a.id === id);
}

/** Assets allowed for cash-in / cash-out on a given network */
export function getCashAssetsForNetwork(chain: AssetChain): SupportedAsset[] {
  return CASH_ASSETS_BY_NETWORK[chain]
    .map((id) => getSupportedAssetById(id))
    .filter((a): a is SupportedAsset => !!a);
}

export function getDefaultCashAssetForNetwork(chain: AssetChain): SupportedAsset {
  return getCashAssetsForNetwork(chain)[0] ?? SUPPORTED_ASSETS[0];
}

/** Prefer connected wallet network; default Base when both or neither connected */
export function detectCashNetwork(
  evmConnected: boolean,
  xrplConnected: boolean
): AssetChain {
  if (evmConnected && !xrplConnected) return "base";
  if (xrplConnected && !evmConnected) return "xrpl";
  return "base";
}

export function isWalletConnectedForNetwork(
  chain: AssetChain,
  evmConnected: boolean,
  xrplConnected: boolean
): boolean {
  return chain === "base" ? evmConnected : xrplConnected;
}

/** Fiat per 1 unit of stablecoin from API supported-currencies row */
export function getFiatRateForAsset(
  asset: SupportedAsset | undefined,
  currency: { rlusd_rate?: number; usdc_rate?: number; usdt_rate?: number } | undefined
): number {
  if (!asset || !currency) return 0;
  if (asset.code === "USDT") {
    return currency.usdt_rate ?? currency.usdc_rate ?? currency.rlusd_rate ?? 0;
  }
  if (asset.code === "USDC") {
    return currency.usdc_rate ?? currency.rlusd_rate ?? 0;
  }
  return currency.rlusd_rate ?? 0;
}

export const XRPL_SEND_ASSETS = SUPPORTED_ASSETS.filter((a) => a.chain === "xrpl");
export const BASE_EVM_ASSETS = SUPPORTED_ASSETS.filter((a) => a.chain === "base");
export const FIAT_OFFRAMP_ASSETS = SUPPORTED_ASSETS.filter((a) => a.supportsFiatOfframp);
