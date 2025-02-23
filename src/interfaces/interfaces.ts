import { type LibauthOutput,type AbiFunction, type Artifact } from 'cashscript';
import type { Input } from "@bitauth/libauth"

export interface ContractInfo {
  contract?: {
    abiFunction: AbiFunction;
    redeemScript: Uint8Array;
    artifact: Partial<Artifact>;
  }
}

export type wcSourceOutputs = (Input & LibauthOutput & ContractInfo)[]

export interface OnChainDataHodlContract {
  txid: string;
  opReturn: string;
  outputs: {
    locking_bytecode: string;
    value_satoshis: number;
    spent: boolean
  }[];
}