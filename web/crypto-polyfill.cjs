// Polyfill globalThis.crypto for Node 16 (needed by Vite 5 / Vitest)
if (!globalThis.crypto) {
  const { webcrypto } = require('crypto');
  globalThis.crypto = webcrypto;
}
