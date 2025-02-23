import type { Artifact, Utxo } from 'cashscript';
import hodlArtifact from '../artifact.json' with { type: 'json' };
import { addressContentsToLockingBytecode, bigIntToVmNumber, binToHex, binToUtf8, decodeCashAddress, hexToBin } from '@bitauth/libauth'

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

export function convertAddressToPkh(userAddress: string){
  const decodeAddressObj = decodeCashAddress(userAddress)
  if(typeof decodeAddressObj == 'string') throw("error decodeCashAddress()")
  const userPkh = decodeAddressObj.payload
  const userPkhHex = binToHex(userPkh)
  return userPkhHex
}

export function convertPkhToLockingBytecode(userPkh: string){
  const userPkhBin = hexToBin(userPkh)
  const userLockingBytecode = addressContentsToLockingBytecode({type:"P2PKH", payload:userPkhBin})
  return userLockingBytecode
}

export function formatTimestamp(unixTimestamp: string | number) {
  if(Number(unixTimestamp) > 500_000_000){
    const date = new Date(Number(unixTimestamp) * 1000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } else return `blockheight ${unixTimestamp}`
}

export const satsToBchAmount = (sats: number) => sats / 100_000_000;

export function getBalance(utxos: Utxo[]): bigint {
  return utxos.reduce((acc, utxo) => acc + utxo.satoshis, 0n);
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