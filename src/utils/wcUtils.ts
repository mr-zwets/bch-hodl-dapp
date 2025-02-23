import type { ContractInfo } from "@/interfaces/interfaces";
import { scriptToBytecode } from "@cashscript/utils";
import type { Contract, UnlockableUtxo } from "cashscript";
import { cashScriptOutputToLibauthOutput } from "cashscript/dist/utils";

export interface signedTxObject {
  signedTransaction: string;
  signedTransactionHash: string;
}

export const generateSourceOutputs = (inputs: UnlockableUtxo[]) => {
  // Generate source outputs from inputs (for signing with SIGHASH_UTXOS)
  const sourceOutputs = inputs.map((input) => {
    const sourceOutput = {
      amount: input.satoshis,
      to: input.unlocker.generateLockingBytecode(),
      token: input.token,
    };

    return cashScriptOutputToLibauthOutput(sourceOutput);
  });
  return sourceOutputs
}

export const createWcContractObj = (contract:Contract, abiFunctionIndex:number) => {
  const wcContractObj:ContractInfo = {
    contract: {
      abiFunction: contract.artifact.abi[abiFunctionIndex],
      redeemScript: scriptToBytecode(contract.redeemScript),
      artifact: contract.artifact,
    }
  }
  return wcContractObj
}