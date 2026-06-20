/**
 * BASE chain service for the web frontend.
 * Uses window.ethereum (MetaMask / Coinbase Wallet) for signing and
 * a public RPC for read-only queries.
 */
import { ethers } from "ethers";
import {
  BASE_CHAIN_ID,
  BASE_CHAIN_ID_HEX,
  BASE_CHAIN_PARAMS,
  BASE_EXPLORER,
  BASE_RPC_URL,
  BASE_USDC_CONTRACT,
  BASE_USDT_CONTRACT,
  USDC_DECIMALS,
  USDT_DECIMALS,
} from "@/config/base";

export {
  BASE_CHAIN_ID,
  BASE_CHAIN_ID_HEX,
  BASE_CHAIN_PARAMS,
  BASE_EXPLORER,
  BASE_RPC_URL,
  BASE_USDC_CONTRACT as BASE_USDC_ADDRESS,
  BASE_USDT_CONTRACT as BASE_USDT_ADDRESS,
  USDC_DECIMALS,
  USDT_DECIMALS,
};

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

function tokenSymbol(tokenAddress: string): string {
  const addr = tokenAddress.toLowerCase();
  if (addr === BASE_USDT_CONTRACT.toLowerCase()) return "USDT";
  if (addr === BASE_USDC_CONTRACT.toLowerCase()) return "USDC";
  return "token";
}

/** Turn MetaMask / ethers errors into short user-facing messages. */
function formatSendError(error: unknown, tokenAddress: string): string {
  const symbol = tokenSymbol(tokenAddress);
  const e = error as {
    code?: number | string;
    reason?: string;
    message?: string;
    error?: { message?: string; data?: string };
  };

  if (e?.code === 4001 || e?.code === "ACTION_REJECTED") {
    return "Transaction cancelled";
  }

  const parts = [e?.reason, e?.error?.message, e?.message].filter(Boolean).join(" ");
  const lower = parts.toLowerCase();

  if (lower.includes("transfer amount exceeds balance") || lower.includes("exceeds balance")) {
    return `Insufficient ${symbol} balance. You don't have enough ${symbol} on Base for this transfer.`;
  }
  if (lower.includes("insufficient funds for gas") || lower.includes("insufficient funds for intrinsic")) {
    return "Insufficient ETH on Base to pay for gas. Add a small amount of ETH to your wallet.";
  }
  if (lower.includes("user rejected") || lower.includes("user denied")) {
    return "Transaction cancelled";
  }
  if (lower.includes("network changed") || lower.includes("wrong network")) {
    return "Please switch your wallet to the Base network and try again.";
  }
  if (lower.includes("nonce too low")) {
    return "Wallet nonce out of sync. Reset your MetaMask account or try again in a moment.";
  }

  // Strip noisy ethers prefixes when a revert reason is buried in the message
  const revertMatch = parts.match(/reason="([^"]+)"/i) || parts.match(/execution reverted:?\s*([^"}\]]+)/i);
  if (revertMatch?.[1]) {
    const reason = revertMatch[1].trim();
    if (/exceeds balance/i.test(reason)) {
      return `Insufficient ${symbol} balance. You don't have enough ${symbol} on Base for this transfer.`;
    }
    return reason;
  }

  return `Failed to send ${symbol}. Please check your balance and try again.`;
}

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
    return baseService.getErc20Balance(address, BASE_USDC_CONTRACT, USDC_DECIMALS);
  },

  getUsdtBalance: async (address: string): Promise<string> => {
    return baseService.getErc20Balance(address, BASE_USDT_CONTRACT, USDT_DECIMALS);
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
    return baseService.sendErc20(BASE_USDC_CONTRACT, destination, amountUsdc, USDC_DECIMALS);
  },

  sendErc20: async (
    tokenAddress: string,
    destination: string,
    amount: string,
    decimals: number = USDC_DECIMALS
  ): Promise<{ hash?: string; error?: string }> => {
    const browserProvider = getBrowserProvider();
    if (!browserProvider) return { error: "No wallet detected" };

    const symbol = tokenSymbol(tokenAddress);

    try {
      const switched = await baseService.switchToBase();
      if (!switched) return { error: "Please switch to Base network in your wallet" };

      const signer = browserProvider.getSigner();
      const walletAddress = await signer.getAddress();
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const parsed = ethers.utils.parseUnits(amount, decimals);

      const balance = await token.balanceOf(walletAddress);
      if (balance.lt(parsed)) {
        const available = ethers.utils.formatUnits(balance, decimals);
        return {
          error: `Insufficient ${symbol} balance. You have ${available} ${symbol} but tried to send ${amount} ${symbol}.`,
        };
      }

      const tx = await token.transfer(destination, parsed);
      const receipt = await tx.wait();
      return { hash: receipt.transactionHash };
    } catch (e: any) {
      console.error("[baseService] sendErc20 error:", e);
      return { error: formatSendError(e, tokenAddress) };
    }
  },

  getTxUrl: (hash: string) => `${BASE_EXPLORER}/tx/${hash}`,
};
