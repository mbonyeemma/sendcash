/**
 * Browser stub for Node's `ws` module.
 *
 * xrpl-connect's bundle contains a Node-only fallback
 * (`typeof WebSocket !== 'undefined' ? self.WebSocket : require('ws')`). In the
 * browser the native `WebSocket` branch is always taken, so the `require('ws')`
 * branch is dead — but bundlers still try to resolve `ws`. Aliasing `ws` to this
 * file (see vite.config.ts) satisfies resolution with the native constructor.
 */
const WS = typeof WebSocket !== "undefined" ? WebSocket : undefined;
export default WS;
export { WS as WebSocket };
