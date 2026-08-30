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
  if(!truncatedOpreturn) throw new Error("failed to parse opreturn data");
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
  if(typeof decodeAddressObj == 'string') throw new Error("Failed to decode user address: " + decodeAddressObj)
  // A p2sh address payload is a script hash, using it as a pubkey hash would make the contract unspendable
  if(decodeAddressObj.type !== 'p2pkh' && decodeAddressObj.type !== 'p2pkhWithTokens'){
    throw new Error(`Connected address is not a P2PKH address (got type '${decodeAddressObj.type}')`)
  }
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
  // 500,000,000 is the BIP65 threshold separating block heights from timestamps
  if(Number(unixTimestamp) >= 500_000_000){
    const date = new Date(Number(unixTimestamp) * 1000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } else return `blockheight ${formatBlockHeight(unixTimestamp)}`
}

// Display block heights with thousands separators, like "886,662"
export const formatBlockHeight = (blockHeight: number | string) => Number(blockHeight).toLocaleString('en-US');

// Human readable duration for a number of blocks, assuming 10 minutes per block
export function formatBlocksDuration(blocksRemaining: number){
  const minutes = blocksRemaining * 10
  if(minutes >= 2 * 24 * 60) return `~${Math.round(minutes / (24 * 60))} days`
  if(minutes >= 2 * 60) return `~${Math.round(minutes / 60)} hours`
  return `~${minutes} minutes`
}

export const satsToBchAmount = (sats: number) => sats / 100_000_000;

// Estimate the unix timestamp (in seconds) at which a future block height will be reached,
// assuming an average of 10 minutes per block
export function estimateBlockHeightTimestamp(targetHeight: number, currentHeight: number) {
  const secondsPerBlock = 600
  return Math.floor(Date.now() / 1000) + (targetHeight - currentHeight) * secondsPerBlock
}

export function getBalance(utxos: Utxo[]): bigint {
  return utxos.reduce((acc, utxo) => acc + utxo.satoshis, 0n);
}
