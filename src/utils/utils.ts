import type { Artifact } from 'cashscript';
import hodlArtifact from '../artifact.json' with { type: 'json' };
import { bigIntToVmNumber, binToHex } from '@bitauth/libauth'

// The hodlArtifact contains a template variables for <locktime> and <pubkeyhash>
// which we need to replace with the actual values for those params
export function constructArtifactWithParams(pkhHex:string, locktime:bigint){
  const strigifiedArtifact = JSON.stringify(hodlArtifact);
  const encodedLocktime = binToHex(bigIntToVmNumber(locktime));
  const artifactWithParams = strigifiedArtifact
    .replace('<locktime>', encodedLocktime)
    .replace('<pubkeyhash>', pkhHex);
  return JSON.parse(artifactWithParams) as Artifact
}


export interface OnChainDataHodlContract {
  txid: string;
  opReturn: string;
  outputs: {
    locking_bytecode: string;
    value_satoshis: number;
  }[];
}