declare module 'tronweb' {
  export interface TronWebInstance {
    fullHost: string;
    headers?: Record<string, string>;
    createAccount(): Promise<{
      address: {
        base58: string;
        hex: string;
      };
      privateKey: string;
      publicKey: string;
    }>;
    trx: {
      getBalance(address: string): Promise<number>;
      getAccount(address: string): Promise<any>;
      getTransaction(txID: string): Promise<any>;
    };
    contract(): {
      at(address: string): Promise<any>;
    };
    toDecimal(value: any): number;
  }

  export default function TronWeb(options: {
    fullHost: string;
    headers?: Record<string, string>;
  }): TronWebInstance;
} 