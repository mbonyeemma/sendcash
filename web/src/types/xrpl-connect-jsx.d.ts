import type { CSSProperties, DetailedHTMLProps, HTMLAttributes } from "react";
import type { WalletConnectorElement } from "xrpl-connect";

/**
 * JSX typing for the `<xrpl-wallet-connector>` web component so it can be
 * rendered (and `ref`-ed) from TSX. Attributes mirror the documented props.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "xrpl-wallet-connector": DetailedHTMLProps<
        HTMLAttributes<WalletConnectorElement> & {
          "background-color"?: string;
          "primary-wallet"?: string;
          style?: CSSProperties;
        },
        WalletConnectorElement
      >;
    }
  }
}

export {};
