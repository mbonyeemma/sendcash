export interface Currency {
  id: string;
  name: string;
  symbol: string;
  type: "crypto" | "fiat";
  logo: string;
  network?: string;
}

export const currencies: Currency[] = [
  // Crypto
  {
    id: "usdc",
    name: "USD Coin",
    symbol: "USDC",
    type: "crypto",
    logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=040",
    network: "Ethereum"
  },
  {
    id: "usdt",
    name: "Tether",
    symbol: "USDT",
    type: "crypto",
    logo: "https://cryptologos.cc/logos/tether-usdt-logo.png?v=040",
    network: "TRON"
  },
  {
    id: "rlusd",
    name: "Ripple USD",
    symbol: "RLUSD",
    type: "crypto",
    logo: "https://cryptologos.cc/logos/xrp-xrp-logo.png?v=040",
    network: "XRPL"
  },
  // Fiat
  {
    id: "ugx",
    name: "Ugandan Shilling",
    symbol: "UGX",
    type: "fiat",
    logo: "https://flagcdn.com/w40/ug.png"
  },
  {
    id: "usd",
    name: "US Dollar",
    symbol: "USD",
    type: "fiat",
    logo: "https://flagcdn.com/w40/us.png"
  },
  {
    id: "kes",
    name: "Kenyan Shilling",
    symbol: "KES",
    type: "fiat",
    logo: "https://flagcdn.com/w40/ke.png"
  },
  {
    id: "eur",
    name: "Euro",
    symbol: "EUR",
    type: "fiat",
    logo: "https://flagcdn.com/w40/eu.png"
  }
];

export const cryptoCurrencies = currencies.filter(c => c.type === "crypto");
export const fiatCurrencies = currencies.filter(c => c.type === "fiat");

export const getCurrencyById = (id: string) => currencies.find(c => c.id === id);

// Exchange rates (mock)
export const exchangeRates: Record<string, Record<string, number>> = {
  usdc: { ugx: 3720, usd: 1, kes: 129, eur: 0.92 },
  usdt: { ugx: 3720, usd: 1, kes: 129, eur: 0.92 },
  rlusd: { ugx: 3720, usd: 1, kes: 129, eur: 0.92 },
  usd: { ugx: 3720, kes: 129, eur: 0.92 },
  ugx: { usd: 0.00027, usdt: 0.00027, usdc: 0.00027, rlusd: 0.00027, kes: 0.035, eur: 0.00025 },
  kes: { ugx: 28.8, usd: 0.0078, eur: 0.0071 },
  eur: { ugx: 4043, usd: 1.09, kes: 140 }
};
