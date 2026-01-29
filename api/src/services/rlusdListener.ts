/**
 * RLUSD listener: subscribes to the custody XRPL account and triggers mobile money
 * when a Payment with a matching memo is received (RLUSD offramp).
 */
import { Client } from "xrpl";
import { Wallet } from "../models/Wallet";

const PAYOUT_ADDRESS = process.env.XRPL_RLUSD_PAYOUT_ADDRESS || '';
const WS_URL = process.env.XRPL_WS_URL || "wss://s.altnet.rippletest.net:51233";

function hexToUtf8(hex: string): string {
  try {
    const bytes = hex.match(/.{1,2}/g) || [];
    return bytes.map((b) => String.fromCharCode(parseInt(b, 16))).join("");
  } catch {
    return "";
  }
}

function getMemosAsText(tx: { Memos?: Array<{ Memo?: { MemoData?: string } }> }): string[] {
  const out: string[] = [];
  const memos = tx.Memos;
  if (!memos || !Array.isArray(memos)) return out;
  for (const m of memos) {
    const data = m.Memo?.MemoData;
    if (data) out.push(hexToUtf8(data));
  }
  return out;
}

function isRlusdPayment(tx: any): boolean {
  if (tx.TransactionType !== "Payment") return false;
  const dest = tx.Destination;
  if (!dest || dest !== PAYOUT_ADDRESS) return false;
  const amount = tx.Amount;
  if (typeof amount === "string") return true; // XRP in drops
  if (amount && typeof amount === "object" && amount.currency) {
    const code = amount.currency;
    const rlusd = code === "RLUSD" || (typeof code === "string" && code.toUpperCase() === "RLUSD");
    return rlusd;
  }
  return false;
}

let client: Client | null = null;
let wallet: Wallet;
let isRunning = false;

export async function startRlusdListener(): Promise<void> {
  if (!PAYOUT_ADDRESS || PAYOUT_ADDRESS.length < 25) {
    console.log("[RLUSD listener] XRPL_RLUSD_PAYOUT_ADDRESS not set; listener disabled.");
    return;
  }
  wallet = new Wallet();
  const c = new Client(WS_URL);
  client = c;

  try {
    await c.connect();
    console.log("[RLUSD listener] Connected to XRPL:", WS_URL);
  } catch (err) {
    console.error("[RLUSD listener] Failed to connect:", err);
    return;
  }

  isRunning = true;
  c.on("disconnected", (code) => {
    console.log("[RLUSD listener] Disconnected, code:", code);
    if (!isRunning) return;
    setTimeout(() => reconnect(), 5000);
  });

  try {
    await c.request({
      command: "subscribe",
      accounts: [PAYOUT_ADDRESS],
    });
    console.log("[RLUSD listener] Subscribed to account:", PAYOUT_ADDRESS);
  } catch (err) {
    console.error("[RLUSD listener] Subscribe failed:", err);
    return;
  }

  c.on("transaction", async (tx: any) => {
    if (!isRunning) return;
    // Stream message: { type, transaction?, hash? } or raw tx
    const txn = tx.transaction ?? tx;
    if (!txn) return;
    if (!isRlusdPayment(txn)) return;
    const memos = getMemosAsText(txn);
    const memo = memos[0] ? memos[0].trim() : "";
    if (!memo) {
      console.log("[RLUSD listener] Payment with no memo ignored");
      return;
    }
    const hash = tx.hash ?? txn.hash ?? "";
    try {
      const result = await wallet.processRlusdPayoutReceived(memo, hash || "");
      console.log("[RLUSD listener] Processed memo:", memo, "result:", result?.status, result?.message);
    } catch (e) {
      console.error("[RLUSD listener] Error processing payout:", e);
    }
  });
}

async function reconnect(): Promise<void> {
  if (!isRunning || !client) return;
  try {
    await client.connect();
    await client.request({
      command: "subscribe",
      accounts: [PAYOUT_ADDRESS],
    });
    console.log("[RLUSD listener] Reconnected and re-subscribed.");
  } catch (err) {
    console.error("[RLUSD listener] Reconnect failed:", err);
    setTimeout(() => reconnect(), 10000);
  }
}

export function stopRlusdListener(): void {
  isRunning = false;
  if (client) {
    client.disconnect();
    client = null;
  }
}
