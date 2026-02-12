import { Client } from "xrpl";
import { sendPayment, createOffer } from "@gemwallet/api";

// XRPL Client configuration
const XRPL_MAINNET = "wss://xrplcluster.com";
const XRPL_TESTNET = "wss://s.altnet.rippletest.net:51233";

interface XRPLBalance {
  currency: string;
  value: string;
  issuer?: string;
}

type IssuedCurrencyAmount = {
  currency: string;
  issuer: string;
  value: string;
};

type XRPLAmount = string | IssuedCurrencyAmount; // string = XRP drops

type DexQuote = {
  rate: number; // 1 fromAsset = rate toAsset
  expectedOut: string;
  liquidityOk: boolean;
  note?: string;
};

const DROPS_PER_XRP = 1_000_000;
const asNumber = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
};

const xrpToDrops = (xrp: number) => String(Math.round(xrp * DROPS_PER_XRP));
const dropsToXrp = (drops: string) => asNumber(drops) / DROPS_PER_XRP;

const amountToNumber = (amt: XRPLAmount) => {
  if (typeof amt === "string") return dropsToXrp(amt);
  return asNumber(amt.value);
};

/** XRPL non-standard currency: 40-char hex (ASCII of code, right-padded with zeros). */
const currencyToHex = (code: string): string => {
  const hex = Array.from(new TextEncoder().encode(code))
    .map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
    .join("");
  const out = (hex + "0".repeat(40)).slice(0, 40);
  console.log("[xrplService] currencyToHex", { code, hexLength: out.length, hex: out });
  return out;
};

export const xrplService = {
  /**
   * Get account balances from XRPL
   */
  getAccountBalances: async (address: string, network: string = "Mainnet"): Promise<XRPLBalance[]> => {
    // Frontend is Mainnet-only; ignore Testnet requests
    const client = new Client(XRPL_MAINNET);
    
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
   * Check if the account has a trustline for a given issued currency+issuer.
   */
  hasTrustline: async (address: string, currency: string, issuer: string): Promise<boolean> => {
    const client = new Client(XRPL_MAINNET);
    try {
      await client.connect();
      const trustLines = await client.request({
        command: "account_lines",
        account: address,
        ledger_index: "validated",
      });
      const lines: any[] = (trustLines as any)?.result?.lines ?? [];
      const wantedCurrency = currency.toUpperCase();
      const wantedIssuer = issuer;
      return lines.some((line) => {
        const c = xrplService.formatCurrency(String(line.currency || "")).toUpperCase();
        return c === wantedCurrency && String(line.account || "") === wantedIssuer;
      });
    } finally {
      await client.disconnect();
    }
  },

  /**
   * Ensure RLUSD trustline exists; if not, request it via wallet signing.
   * Returns true if trustline exists (or was successfully created).
   */
  ensureRlusdTrustline: async (address: string): Promise<{ ok: boolean; reason?: string }> => {
    const issuer = xrplService.getRLUSDIssuer();
    try {
      const has = await xrplService.hasTrustline(address, "RLUSD", issuer);
      if (has) return { ok: true };
    } catch (e: any) {
      // If we can't check, still allow user to attempt; swap may fail on-ledger
      return { ok: false, reason: e?.message || "Failed to check trustline." };
    }
    try {
      const res = await xrplService.setTrustline("RLUSD", issuer, "1000000");
      if ((res as any)?.type === "reject") return { ok: false, reason: "Trustline request cancelled." };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, reason: e?.message || "Failed to create trustline." };
    }
  },

  /**
   * Get a DEX quote from XRPL order book (no wallet prompt).
   * Uses book_offers and walks offers best-first to estimate output for the given input amount.
   */
  getDexQuote: async (
    fromAsset: "XRP" | "RLUSD",
    toAsset: "XRP" | "RLUSD",
    fromAmount: number
  ): Promise<DexQuote> => {
    if (!fromAmount || !Number.isFinite(fromAmount) || fromAmount <= 0) {
      return { rate: 0, expectedOut: "0", liquidityOk: false, note: "Enter a valid amount." };
    }
    if (fromAsset === toAsset) {
      return { rate: 1, expectedOut: String(fromAmount), liquidityOk: true };
    }

    const issuer = xrplService.getRLUSDIssuer();
    // book_offers: XRP = "XRP"; non-3-letter codes (e.g. RLUSD) must be 40-char hex
    const rlusdCurrency = currencyToHex("RLUSD");
    const taker_gets =
      toAsset === "XRP" ? { currency: "XRP" } : { currency: rlusdCurrency, issuer };
    const taker_pays =
      fromAsset === "XRP" ? { currency: "XRP" } : { currency: rlusdCurrency, issuer };

    console.log("[xrplService] getDexQuote request", {
      fromAsset,
      toAsset,
      fromAmount,
      issuer,
      taker_gets,
      taker_pays,
    });

    const client = new Client(XRPL_MAINNET);
    try {
      await client.connect();
      const resp = await client.request({
        command: "book_offers",
        taker_gets: taker_gets as any,
        taker_pays: taker_pays as any,
        ledger_index: "validated",
        limit: 50,
      });

      const offers: any[] = (resp as any)?.result?.offers ?? [];
      console.log("[xrplService] getDexQuote response", {
        offerCount: offers.length,
        firstOffer: offers[0] ? { TakerGets: offers[0].TakerGets, TakerPays: offers[0].TakerPays } : null,
        rawResultKeys: resp && typeof resp === "object" ? Object.keys((resp as any).result || {}) : [],
      });
      if (!offers.length) {
        return { rate: 0, expectedOut: "0", liquidityOk: false, note: "No liquidity on XRPL DEX for this pair." };
      }

      let remainingIn = fromAmount;
      let out = 0;

      for (const offer of offers) {
        // In this book, each offer sells `taker_gets` for `taker_pays`
        // As taker, we pay (pays) and receive (gets)
        const offerGets: XRPLAmount = offer?.TakerGets;
        const offerPays: XRPLAmount = offer?.TakerPays;
        const offerGetsNum = amountToNumber(offerGets);
        const offerPaysNum = amountToNumber(offerPays);
        if (!Number.isFinite(offerGetsNum) || !Number.isFinite(offerPaysNum) || offerGetsNum <= 0 || offerPaysNum <= 0) continue;

        // We are providing fromAsset (pays) up to offerPaysNum
        const takeIn = Math.min(remainingIn, offerPaysNum);
        const takeOut = offerGetsNum * (takeIn / offerPaysNum);
        out += takeOut;
        remainingIn -= takeIn;
        if (remainingIn <= 1e-12) break;
      }

      const filled = fromAmount - remainingIn;
      if (filled <= 0 || out <= 0) {
        return { rate: 0, expectedOut: "0", liquidityOk: false, note: "Insufficient liquidity at current prices." };
      }

      const rate = out / filled; // 1 from = rate to
      const quote = {
        rate,
        expectedOut: out.toFixed(6),
        liquidityOk: remainingIn <= 1e-12,
        note: remainingIn <= 1e-12 ? undefined : "Not enough liquidity for the full amount; quote is for partial fill.",
      };
      console.log("[xrplService] getDexQuote result", quote);
      return quote;
    } catch (err: any) {
      console.error("[xrplService] getDexQuote error", err?.message || err, err);
      throw err;
    } finally {
      await client.disconnect();
    }
  },

  /**
   * Execute a DEX swap via OfferCreate (wallet prompt occurs here).
   * Uses ImmediateOrCancel and enforces slippage via minOut in the offer.
   */
  createDexSwapOffer: async (params: {
    fromAsset: "XRP" | "RLUSD";
    toAsset: "XRP" | "RLUSD";
    fromAmount: number;
    expectedOut: number;
    slippagePct: number; // e.g. 0.5 for 0.5%
  }) => {
    const { fromAsset, toAsset, fromAmount, expectedOut, slippagePct } = params;
    if (fromAsset === toAsset) throw new Error("Select different assets to swap.");
    if (!fromAmount || !Number.isFinite(fromAmount) || fromAmount <= 0) throw new Error("Enter a valid amount.");
    if (!expectedOut || !Number.isFinite(expectedOut) || expectedOut <= 0) throw new Error("Quote unavailable.");

    const issuer = xrplService.getRLUSDIssuer();
    const minOut = expectedOut * (1 - Math.max(0, slippagePct) / 100);

    // OfferCreate semantics (maker perspective):
    // - TakerGets: what we give
    // - TakerPays: what we want to receive
    let takerGets: XRPLAmount;
    let takerPays: XRPLAmount;

    if (fromAsset === "XRP" && toAsset === "RLUSD") {
      takerGets = xrpToDrops(fromAmount);
      takerPays = { currency: "RLUSD", issuer, value: minOut.toFixed(6) };
    } else if (fromAsset === "RLUSD" && toAsset === "XRP") {
      takerGets = { currency: "RLUSD", issuer, value: fromAmount.toFixed(6) };
      takerPays = xrpToDrops(minOut);
    } else {
      throw new Error("Unsupported pair.");
    }

    console.log("[xrplService] createDexSwapOffer", {
      fromAsset,
      toAsset,
      fromAmount,
      expectedOut,
      minOut,
      slippagePct,
      takerGets,
      takerPays,
    });

    // GemWallet returns { type: 'response' | 'reject', result?: { hash } }
    const result = await createOffer({
      takerGets: takerGets as any,
      takerPays: takerPays as any,
      flags: {
        tfImmediateOrCancel: true,
      },
    } as any);

    return result;
  },

  /**
   * Send payment using GemWallet (optionally with memo for RLUSD offramp)
   */
  /** XRP: 1 XRP = 1e6 drops. GemWallet expects native XRP amount as drops (string). */
  sendPayment: async (
    destination: string,
    amount: string,
    currency: string = "XRP",
    issuer?: string,
    memo?: string
  ) => {
    try {
      // User-facing amount is in XRP; protocol expects drops (integer string)
      const amountForPayment =
        currency === "XRP"
          ? String(Math.round(parseFloat(amount || "0") * 1_000_000))
          : amount;
      
      // Convert non-standard currency codes (like RLUSD) to 40-char hex format
      const currencyCode = currency === "XRP" ? currency : (currency.length === 3 ? currency : currencyToHex(currency));
      
      const payment: Record<string, unknown> = {
        amount: currency === "XRP"
          ? amountForPayment
          : {
              currency: currencyCode,
              issuer: issuer || "",
              value: amount
            },
        destination: destination,
      };
      // Use DestinationTag (32-bit unsigned) when memo is numeric – composes correctly for signing
      if (memo && memo.trim()) {
        const trimmed = memo.trim();
        const asNum = parseInt(trimmed, 10);
        if (String(asNum) === trimmed && asNum >= 0 && asNum <= 0xFFFFFFFF) {
          payment.destinationTag = asNum;
        } else {
          const memoHex = Array.from(new TextEncoder().encode(trimmed))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
            .toUpperCase();
          payment.memos = [{ Memo: { MemoData: memoHex } }];
        }
      }
      
      console.log("[xrplService] sendPayment payload:", {
        destination,
        currency,
        currencyCode,
        amount,
        issuer,
        memo,
        payment: JSON.stringify(payment, null, 2)
      });
      
      // Returns { type: "response" | "reject", result?: { hash } } – check type for user cancel
      const result = await sendPayment(payment as any);
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
   * Get RLUSD issuer address (env: VITE_RLUSD_ISSUER; fallback = official mainnet issuer)
   */
  getRLUSDIssuer: (_network?: string): string => {
    return import.meta.env.VITE_RLUSD_ISSUER || "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";
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
