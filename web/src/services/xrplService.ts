import { Client } from "xrpl";
import { sendPayment } from "@gemwallet/api";

// XRPL Client configuration
const XRPL_MAINNET = "wss://xrplcluster.com";
const XRPL_TESTNET = "wss://s.altnet.rippletest.net:51233";

interface XRPLBalance {
  currency: string;
  value: string;
  issuer?: string;
}

export const xrplService = {
  /**
   * Get account balances from XRPL
   */
  getAccountBalances: async (address: string, network: string = "Mainnet"): Promise<XRPLBalance[]> => {
    const client = new Client(network === "Testnet" ? XRPL_TESTNET : XRPL_MAINNET);
    
    try {
      await client.connect();
      
      // Get XRP balance
      const accountInfo = await client.request({
        command: "account_info",
        account: address,
        ledger_index: "validated"
      });
      
      const xrpBalance = Number(accountInfo.result.account_data.Balance) / 1000000; // Convert drops to XRP
      
      const balances: XRPLBalance[] = [
        {
          currency: "XRP",
          value: xrpBalance.toFixed(6)
        }
      ];
      
      // Get trust line balances (tokens like RLUSD)
      try {
        const trustLines = await client.request({
          command: "account_lines",
          account: address,
          ledger_index: "validated"
        });
        
        if (trustLines.result.lines) {
          trustLines.result.lines.forEach((line: any) => {
            balances.push({
              currency: line.currency,
              value: line.balance,
              issuer: line.account
            });
          });
        }
      } catch (error) {
        console.error("Error fetching trust lines:", error);
      }
      
      await client.disconnect();
      return balances;
    } catch (error) {
      console.error("Error fetching XRPL balances:", error);
      await client.disconnect();
      throw error;
    }
  },

  /**
   * Send payment using GemWallet
   */
  sendPayment: async (
    destination: string,
    amount: string,
    currency: string = "XRP",
    issuer?: string
  ) => {
    try {
      const payment = {
        amount: currency === "XRP" 
          ? amount // XRP in drops (will be converted by GemWallet)
          : {
              currency: currency,
              issuer: issuer || "",
              value: amount
            },
        destination: destination,
      };
      
      const result = await sendPayment(payment);
      return result;
    } catch (error) {
      console.error("Error sending payment:", error);
      throw error;
    }
  },

  /**
   * Format currency code (handle hex codes)
   */
  formatCurrency: (currency: string): string => {
    // If currency is 40 characters (hex), it's a non-standard code
    if (currency.length === 40) {
      // Try to decode hex to ASCII
      try {
        const hex = currency.replace(/00+$/, ''); // Remove trailing zeros
        let str = '';
        for (let i = 0; i < hex.length; i += 2) {
          const charCode = parseInt(hex.substr(i, 2), 16);
          if (charCode > 0) str += String.fromCharCode(charCode);
        }
        return str || currency;
      } catch {
        return currency;
      }
    }
    return currency;
  },

  /**
   * Get RLUSD issuer address (Ripple's official issuer)
   */
  getRLUSDIssuer: (network: string = "Mainnet"): string => {
    if (network === "Testnet") {
      // Official Testnet RLUSD issuer from Ripple
      return "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV";
    }
    // Mainnet RLUSD issuer (update when available)
    return "rN5JM3R9Y4rCNQbhHDsJAKkpHBLJzx3yXA";
  },

  /**
   * Request test XRP from faucet (Testnet only)
   */
  requestTestXRP: async (address: string): Promise<any> => {
    try {
      const response = await fetch("https://faucet.altnet.rippletest.net/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination: address,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to request test XRP");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error requesting test XRP:", error);
      throw error;
    }
  },

  /**
   * Create trustline for RLUSD (required before receiving RLUSD)
   */
  setTrustline: async (currency: string, issuer: string, limit: string = "1000000") => {
    try {
      // Import setTrustline from GemWallet API
      const { setTrustline } = await import("@gemwallet/api");
      
      const trustline = {
        limitAmount: {
          currency: currency,
          issuer: issuer,
          value: limit,
        },
      };
      
      const result = await setTrustline(trustline);
      return result;
    } catch (error) {
      console.error("Error creating trustline:", error);
      throw error;
    }
  },

  /**
   * Get RLUSD faucet URL
   */
  getRLUSDFaucetURL: (): string => {
    return "https://tryrlusd.com/";
  }
};
