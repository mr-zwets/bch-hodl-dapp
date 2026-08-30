
// Response format of the WalletConnect 'bch_signTransaction' RPC call
export interface SignedTxObject {
  signedTransaction: string;
  signedTransactionHash: string;
}

export interface OnChainDataHodlContract {
  txid: string;
  opReturn: string;
  outputs: {
    locking_bytecode: string;
    value_satoshis: number;
    spent: boolean
  }[];
}