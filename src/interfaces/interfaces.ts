
// Response format of the WalletConnect 'bch_signTransaction' RPC call
export interface SignedTxObject {
  signedTransaction: string;
  signedTransactionHash: string;
}

export interface OnChainDataHodlContract {
  txid: string;
  opReturn: string;
  inputs: {
    unlocking_bytecode: string;
  }[];
  outputs: {
    locking_bytecode: string;
    value_satoshis: number;
    spent: boolean;
    // unlocking bytecode of the input spending this output, if it has been spent
    spending_unlocking_bytecode?: string;
  }[];
}