import {
  authenticationInstructionsAreMalformed,
  bigIntToVmNumber,
  binToHex,
  decodeAuthenticationInstructions,
  encodeDataPush,
  flattenBinArray,
  hash160,
  hexToBin,
  OpcodesBch2023,
  vmNumberToBigInt,
} from '@bitauth/libauth'
import type { OnChainDataHodlContract } from '@/interfaces/interfaces'
import { parseOpreturn } from './utils'

export interface VerifiedHodlContract {
  locktime: bigint;
  satoshis: number;
  isSpent: boolean;
}

const isP2pkhLockingBytecode = (bytecodeHex: string) =>
  bytecodeHex.length == 50 && bytecodeHex.startsWith('76a914') && bytecodeHex.endsWith('88ac')

const isP2sh20LockingBytecode = (bytecodeHex: string) =>
  bytecodeHex.length == 46 && bytecodeHex.startsWith('a914') && bytecodeHex.endsWith('87')

export function buildHodlRedeemScript(locktime: bigint, pkh: Uint8Array): Uint8Array {
  return flattenBinArray([
    encodeDataPush(bigIntToVmNumber(locktime)),
    Uint8Array.of(
      OpcodesBch2023.OP_CHECKLOCKTIMEVERIFY,
      OpcodesBch2023.OP_DROP,
      OpcodesBch2023.OP_DUP,
      OpcodesBch2023.OP_HASH160,
    ),
    encodeDataPush(pkh),
    Uint8Array.of(OpcodesBch2023.OP_EQUALVERIFY, OpcodesBch2023.OP_CHECKSIG),
  ])
}

function extractDataPushes(bytecodeHex: string): Uint8Array[] {
  const instructions = decodeAuthenticationInstructions(hexToBin(bytecodeHex))
  if (authenticationInstructionsAreMalformed(instructions)) return []
  return instructions.flatMap(instruction => 'data' in instruction ? [instruction.data] : [])
}

// Returns the locktime and pkh if the redeem script exactly matches the hodl contract template
function parseHodlRedeemScript(redeemScript: Uint8Array): { locktime: bigint, pkh: Uint8Array } | undefined {
  const instructions = decodeAuthenticationInstructions(redeemScript)
  if (authenticationInstructionsAreMalformed(instructions)) return undefined
  if (instructions.length != 8) return undefined
  const locktimePush = instructions[0]
  const pkhPush = instructions[5]
  if (!('data' in locktimePush) || !('data' in pkhPush) || pkhPush.data.length != 20) return undefined
  const locktime = vmNumberToBigInt(locktimePush.data)
  if (typeof locktime != 'bigint') return undefined
  // Rebuild the script from the parsed values and require an exact match, so the opcodes
  // in between and the encoding of the pushes are also checked
  const rebuiltRedeemScript = buildHodlRedeemScript(locktime, pkhPush.data)
  if (binToHex(rebuiltRedeemScript) != binToHex(redeemScript)) return undefined
  return { locktime, pkh: pkhPush.data }
}

// Verifies a chaingraph result item is a genuine hodl contract without trusting the opreturn:
// - spent contracts: the redeem script revealed by the spending input is the ground truth
// - unspent contracts: rebuild the redeem script from the opreturn's claimed locktime and
//   candidate pubkey hashes revealed by the funding transaction (p2pkh change outputs and
//   input pubkeys), and check it hashes to the contract output's p2sh20 locking bytecode
// Returns undefined when the item cannot be verified as a hodl contract
export function verifyHodlContract(chaingraphItem: OnChainDataHodlContract): VerifiedHodlContract | undefined {
  try {
    const contractOutput = chaingraphItem.outputs.find(output => isP2sh20LockingBytecode(output.locking_bytecode))
    if (!contractOutput) return undefined
    const contractScriptHashHex = contractOutput.locking_bytecode.slice(4, 44)

    // Spent contract: the redeem script is the last data push of the spending input
    if (contractOutput.spending_unlocking_bytecode) {
      const dataPushes = extractDataPushes(contractOutput.spending_unlocking_bytecode)
      const redeemScript = dataPushes[dataPushes.length - 1]
      if (!redeemScript) return undefined
      if (binToHex(hash160(redeemScript)) != contractScriptHashHex) return undefined
      const parsedRedeemScript = parseHodlRedeemScript(redeemScript)
      if (!parsedRedeemScript) return undefined
      return { locktime: parsedRedeemScript.locktime, satoshis: contractOutput.value_satoshis, isSpent: true }
    }

    // Unspent contract: gather candidate pkhs from the funding transaction
    const claimedLocktime = BigInt(parseOpreturn(chaingraphItem.opReturn))
    const candidatePkhs: string[] = []
    for (const output of chaingraphItem.outputs) {
      if (isP2pkhLockingBytecode(output.locking_bytecode)) {
        candidatePkhs.push(output.locking_bytecode.slice(6, 46))
      }
    }
    for (const input of chaingraphItem.inputs) {
      for (const dataPush of extractDataPushes(input.unlocking_bytecode)) {
        const isPubkeyLength = dataPush.length == 33 || dataPush.length == 65
        if (isPubkeyLength) candidatePkhs.push(binToHex(hash160(dataPush)))
      }
    }

    for (const candidatePkh of candidatePkhs) {
      const redeemScript = buildHodlRedeemScript(claimedLocktime, hexToBin(candidatePkh))
      if (binToHex(hash160(redeemScript)) == contractScriptHashHex) {
        return { locktime: claimedLocktime, satoshis: contractOutput.value_satoshis, isSpent: false }
      }
    }
    return undefined
  } catch {
    // Malformed opreturn or bytecode data means the item cannot be verified
    return undefined
  }
}
