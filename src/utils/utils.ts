import type { Artifact } from 'cashscript';
import hodlArtifact from '../artifact.json' with { type: 'json' };
import { bigIntToVmNumber, binToHex, binToUtf8, hexToBin } from '@bitauth/libauth'

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

export function parseOpreturn(opreturnData: string) {
  const truncatedOpreturn = opreturnData.split("04686f646c")[1];
  const lengthAddressHex = truncatedOpreturn.slice(0, 2);
  const lengthAddress = parseInt(lengthAddressHex, 16);
  const truncatedOpreturn2 = truncatedOpreturn.slice(2 + lengthAddress * 2);
  const lengthLocktimeHex = truncatedOpreturn2.slice(0, 2);
  const lengthLocktime = parseInt(lengthLocktimeHex, 16);
  const locktimeEncoded = truncatedOpreturn2.slice(2, 2 + lengthLocktime * 2 );
  const locktime = binToUtf8(hexToBin(locktimeEncoded));
  return locktime;
}

export interface OnChainDataHodlContract {
  txid: string;
  opReturn: string;
  outputs: {
    locking_bytecode: string;
    value_satoshis: number;
  }[];
}