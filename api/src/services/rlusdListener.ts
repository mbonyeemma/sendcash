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

/** Normalize XRPL currency: hex (40 chars) decodes to ASCII e.g. RLUSD */
function normalizeCurrency(code: string | undefined): string {
  if (!code || typeof code !== "string") return "";
  if (code.length === 40 && /^[0-9A-Fa-f]+$/.test(code)) {
    return hexToUtf8(code).replace(/\0/g, "").trim();
  }
  return code;
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
  const txType = tx.TransactionType ?? tx.transaction_type;
  if (txType !== "Payment") return false;
  const dest = tx.Destination ?? tx.destination;
  if (!dest || dest !== PAYOUT_ADDRESS) return false;
  // XRPL Payment can have Amount or DeliverMax (stream sends DeliverMax for token payments)
  const amount = tx.Amount ?? tx.amount ?? tx.DeliverMax ?? tx.deliver_max;
  if (typeof amount === "string") return true; // XRP in drops
  if (amount && typeof amount === "object") {
    const raw = amount.currency ?? amount.Currency;
    const code = normalizeCurrency(raw) || (typeof raw === "string" ? raw : "");
    return code.toUpperCase() === "RLUSD";
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
    // Server may send transaction in .transaction or .tx_json (rippled stream format)
    const txn = tx.transaction ?? tx.tx_json ?? tx;
    const hash = tx.hash ?? txn?.hash ?? "";
    const dest = txn?.Destination ?? txn?.destination;
    const tag = txn?.DestinationTag ?? txn?.destination_tag;
    const amount = txn?.Amount ?? txn?.amount ?? txn?.DeliverMax ?? txn?.deliver_max;
    const txType = txn?.TransactionType ?? txn?.transaction_type ?? tx?.type;
    // Always log every transaction event (at least one line)
    console.log("[RLUSD listener] TX received | type:", txType, "| dest:", dest === PAYOUT_ADDRESS ? "OUR_ACCOUNT" : (dest || "?"), "| tag:", tag ?? "-", "| amount:", typeof amount === "object" ? JSON.stringify(amount) : (amount ?? "-"), "| hash:", hash || "-", "| validated:", tx.validated);
    if (!txn) {
      console.log("[RLUSD listener] Skipped: no transaction body, keys:", Object.keys(tx || {}));
      return;
    }
    if (dest == null && txn) {
      console.log("[RLUSD listener] txn keys (for debug):", Object.keys(txn));
    }
    if (tx.validated === false) {
      console.log("[RLUSD listener] Skipped: not validated yet");
      return;
    }
    if (dest !== PAYOUT_ADDRESS) {
      console.log("[RLUSD listener] Skipped: destination not custody account");
      return;
    }
    if (!isRlusdPayment(txn)) {
      console.log("[RLUSD listener] Skipped: not RLUSD/XRP payment, Amount:", amount);
      return;
    }
    let refId = "";
    if (tag != null && tag !== undefined) {
      refId = String(tag);
    }
    if (!refId) {
      const memos = getMemosAsText(txn);
      refId = memos[0] ? memos[0].trim() : "";
    }
    if (!refId) {
      console.log("[RLUSD listener] Skipped: no destination tag or memo");
      return;
    }
    console.log("[RLUSD listener] Processing payout | ref:", refId, "| hash:", hash);
    try {
      const result = await wallet.processRlusdPayoutReceived(refId, hash || "");
      console.log("[RLUSD listener] Payout result | ref:", refId, "| status:", result?.status, "| message:", result?.message);
    } catch (e) {
      console.error("[RLUSD listener] Payout error | ref:", refId, "|", e);
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
