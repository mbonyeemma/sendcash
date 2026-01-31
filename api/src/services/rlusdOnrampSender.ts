/**
 * Sends RLUSD from the onramp source (custody) to a destination XRPL address.
 * Used when onramp payment is confirmed – wallet takes over and credits user.
 */
import { Client, Wallet as XrplWallet, Payment } from "xrpl";

const SOURCE_SECRET = process.env.ONRAMP_RLUSD_SOURCE_SECRET || '';
const SOURCE_ADDRESS = process.env.ONRAMP_RLUSD_SOURCE_ADDRESS || '';
const WS_URL = process.env.XRPL_WS_URL || "wss://s.altnet.rippletest.net:51233";
const RLUSD_ISSUER = process.env.RLUSD_ISSUER || 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV';

export async function sendRlusdToDestination(
  destinationAddress: string,
  amountRlusd: string,
  memo?: string
): Promise<{ hash?: string; error?: string }> {
  if (!SOURCE_SECRET || !SOURCE_ADDRESS || !destinationAddress) {
    return { error: "Onramp RLUSD source or destination not configured" };
  }
  const client = new Client(WS_URL);
  try {
    await client.connect();
    const wallet = XrplWallet.fromSeed(SOURCE_SECRET);
    const amount = {
      currency: "RLUSD",
      issuer: RLUSD_ISSUER,
      value: amountRlusd,
    };
    const tx: Payment = {
      TransactionType: "Payment",
      Account: wallet.address,
      Destination: destinationAddress,
      Amount: amount,
    };
    if (memo && memo.trim()) {
      const memoHex = Buffer.from(memo.trim().slice(0, 256), "utf8").toString("hex").toUpperCase();
      tx.Memos = [{ Memo: { MemoData: memoHex } }];
    }
    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    const hash = result.result.hash;
    return { hash };
  } catch (e: any) {
    console.error("[rlusdOnrampSender] Error:", e?.message || e);
    return { error: e?.message || "Failed to send RLUSD" };
  } finally {
    await client.disconnect();
  }
}
