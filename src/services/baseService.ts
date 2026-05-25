/**
 * BASE chain service for the web frontend.
 * Uses window.ethereum (MetaMask / Coinbase Wallet) for signing and
 * a public RPC for read-only queries.
 */
import { ethers } from "ethers";

export const BASE_CHAIN_ID = 8453;
export const BASE_CHAIN_ID_HEX = "0x2105";
export const BASE_RPC_URL = "https://mainnet.base.org";
export const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const BASE_USDT_ADDRESS = "0xfde4C96c8593536E31F229EA8f37b2AD310E2B67";
export const USDC_DECIMALS = 6;
export const USDT_DECIMALS = 6;
export const BASE_EXPLORER = "https://basescan.org";

export const BASE_CHAIN_PARAMS = {
  chainId: BASE_CHAIN_ID_HEX,
  chainName: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: [BASE_RPC_URL],
  blockExplorerUrls: [BASE_EXPLORER],
};

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

function getReadProvider(): ethers.providers.JsonRpcProvider {
  return new ethers.providers.JsonRpcProvider(BASE_RPC_URL, {
    name: "base",
    chainId: BASE_CHAIN_ID,
  });
}

function getBrowserProvider(): ethers.providers.Web3Provider | null {
  const w = window as any;
  if (!w.ethereum) return null;
  return new ethers.providers.Web3Provider(w.ethereum, "any");
}

export const baseService = {
  getErc20Balance: async (
    walletAddress: string,
    tokenAddress: string,
    decimals: number
  ): Promise<string> => {
    try {
      const provider = getReadProvider();
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const balance = await token.balanceOf(walletAddress);
      return ethers.utils.formatUnits(balance, decimals);
    } catch (e: any) {
      console.error("[baseService] getErc20Balance error:", e?.message);
      return "0";
    }
  },

  getUsdcBalance: async (address: string): Promise<string> => {
    return baseService.getErc20Balance(address, BASE_USDC_ADDRESS, USDC_DECIMALS);
  },

  getUsdtBalance: async (address: string): Promise<string> => {
    return baseService.getErc20Balance(address, BASE_USDT_ADDRESS, USDT_DECIMALS);
  },

  getEthBalance: async (address: string): Promise<string> => {
    try {
      const provider = getReadProvider();
      const balance = await provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (e: any) {
      console.error("[baseService] getEthBalance error:", e?.message);
      return "0";
    }
  },

  /**
   * Switch the user's wallet to Base network. If not added, prompt to add it.
   */
  switchToBase: async (): Promise<boolean> => {
    const w = window as any;
    if (!w.ethereum) return false;
    try {
      await w.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_CHAIN_ID_HEX }],
      });
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await w.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [BASE_CHAIN_PARAMS],
          });
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  },

  /**
   * Send USDC to a destination address on Base.
   * Prompts the user's browser wallet for approval.
   */
  sendUsdc: async (
    destination: string,
    amountUsdc: string
  ): Promise<{ hash?: string; error?: string }> => {
    return baseService.sendErc20(BASE_USDC_ADDRESS, destination, amountUsdc, USDC_DECIMALS);
  },

  sendErc20: async (
    tokenAddress: string,
    destination: string,
    amount: string,
    decimals: number = USDC_DECIMALS
  ): Promise<{ hash?: string; error?: string }> => {
    const browserProvider = getBrowserProvider();
    if (!browserProvider) return { error: "No wallet detected" };

    try {
      const switched = await baseService.switchToBase();
      if (!switched) return { error: "Please switch to Base network in your wallet" };

      const signer = browserProvider.getSigner();
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const parsed = ethers.utils.parseUnits(amount, decimals);

      const tx = await token.transfer(destination, parsed);
      const receipt = await tx.wait();
      return { hash: receipt.transactionHash };
    } catch (e: any) {
      if (e?.code === 4001 || e?.code === "ACTION_REJECTED") {
        return { error: "Transaction cancelled" };
      }
      console.error("[baseService] sendErc20 error:", e);
      return { error: e?.message || "Failed to send token" };
    }
  },

  getTxUrl: (hash: string) => `${BASE_EXPLORER}/tx/${hash}`,
};
