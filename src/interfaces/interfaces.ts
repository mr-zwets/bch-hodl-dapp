
export interface OnChainDataHodlContract {
  txid: string;
  opReturn: string;
  outputs: {
    locking_bytecode: string;
    value_satoshis: number;
    spent: boolean
  }[];
}