/**
 * Ambient type declarations for `xrpl-connect` (v0.8.x).
 *
 * The published package ships no `.d.ts` files, so we declare the minimal
 * surface SendiCash uses. Mirror the runtime API from the bundle:
 *  - WalletManager: connect(adapterId)/disconnect/sign/signAndSubmit, `account`, events
 *  - Adapters constructed and passed to the manager
 *  - The `<xrpl-wallet-connector>` custom element (auto-registered on import)
 */
declare module "xrpl-connect" {
  export interface WalletAccount {
    address: string;
    publicKey?: string;
    network?: string;
  }

  /** Result of a signed-and-submitted transaction. */
  export interface SignResult {
    hash?: string;
    tx_blob?: string;
    signature?: string;
    [key: string]: unknown;
  }

  export interface WalletErrorLike {
    code?: string;
    message: string;
  }

  export type WalletAdapterId =
    | "xaman"
    | "crossmark"
    | "gemwallet"
    | "walletconnect"
    | "ledger"
    | "otsu"
    | "xyra";

  export interface WalletAdapter {
    id: WalletAdapterId | string;
    name: string;
  }

  export interface WalletManagerOptions {
    adapters: WalletAdapter[];
    network?: "mainnet" | "testnet" | string;
    /** Restore the previous session from localStorage on construction. */
    autoConnect?: boolean;
    logger?: unknown;
    storage?: unknown;
  }

  type WalletEvent = "connect" | "connecting" | "disconnect" | "error";

  export class WalletManager {
    constructor(options: WalletManagerOptions);
    readonly account: WalletAccount | null;
    getAccount(): WalletAccount | null;
    connect(adapterId: string, options?: Record<string, unknown>): Promise<void>;
    disconnect(): Promise<void>;
    sign(tx: Record<string, unknown>): Promise<SignResult>;
    signAndSubmit(tx: Record<string, unknown>): Promise<SignResult>;
    on(event: "connect", cb: (account: WalletAccount) => void): void;
    on(event: "disconnect", cb: () => void): void;
    on(event: "error", cb: (error: WalletErrorLike) => void): void;
    on(event: "connecting", cb: () => void): void;
    off(event: WalletEvent, cb: (...args: unknown[]) => void): void;
  }

  export class XamanAdapter implements WalletAdapter {
    constructor(options?: { apiKey?: string });
    id: "xaman";
    name: string;
  }
  export class CrossmarkAdapter implements WalletAdapter {
    constructor(options?: Record<string, unknown>);
    id: "crossmark";
    name: string;
  }
  export class GemWalletAdapter implements WalletAdapter {
    constructor(options?: Record<string, unknown>);
    id: "gemwallet";
    name: string;
  }
  export class WalletConnectAdapter implements WalletAdapter {
    constructor(options?: { projectId?: string; metadata?: Record<string, unknown> });
    id: "walletconnect";
    name: string;
  }

  /** The custom element class backing `<xrpl-wallet-connector>`. */
  export class WalletConnectorElement extends HTMLElement {
    setWalletManager(manager: WalletManager): void;
    open(): void;
    close(): void;
  }

  export const isMobile: () => boolean;
}
