<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStore } from '../store/store';
import { constructArtifactWithParams, convertAddressToPkh, convertPkhToLockingBytecode, estimateBlockHeightTimestamp, formatBlockHeight, formatBlocksDuration, formatTimestamp, getBalance } from '@/utils/utils';
import { Contract, placeholderP2PKHUnlocker, TransactionBuilder, type Output, type Unlocker } from 'cashscript';
import { network } from '@/config';
const store = useStore()

const locktimeInput = ref('')
const bchAmountInput = ref('')

// Live estimate of the unlock date while the user types a block height
const estimatedUnlock = computed(() => {
  if(!locktimeInput.value || !store.currentBlockHeight) return undefined
  const locktime = Number(locktimeInput.value)
  if(!Number.isInteger(locktime) || locktime <= 0 || locktime >= 500_000_000) return undefined
  if(locktime <= store.currentBlockHeight) return { inPast: true }
  const blocksRemaining = locktime - store.currentBlockHeight
  return {
    inPast: false,
    date: formatTimestamp(estimateBlockHeightTimestamp(locktime, store.currentBlockHeight)),
    duration: formatBlocksDuration(blocksRemaining),
    blocksRemaining,
  }
})

async function proposeWcTransaction(){
  try {
    await createHodlContract()
  } catch (error) {
    console.error(error)
    alert(error instanceof Error ? error.message : String(error))
  }
}

async function createHodlContract(){
  if(!store.userAddress || store.userUtxos == undefined) return

  const bchAmount = Number(bchAmountInput.value)
  if(Number.isNaN(bchAmount) || bchAmount <= 0) throw new Error("Invalid BCH amount to lock")
  // Math.round to avoid floating point imprecision like 0.29 * 1e8 === 28999999.999999996
  const amountSatsNewContract = BigInt(Math.round(bchAmount * 100_000_000))
  // Same minimum as the EC plugin, safely above the ~896 sats needed to reclaim (546 dust + fee)
  if(amountSatsNewContract < 1000n) throw new Error("Minimum amount to lock is 1000 satoshis (0.00001 BCH)")

  const locktime = Number(locktimeInput.value)
  if(!Number.isInteger(locktime) || locktime <= 0){
    throw new Error("Invalid locktime: enter a whole number block height")
  }
  // Values >= 500,000,000 are interpreted as unix timestamps by OP_CHECKLOCKTIMEVERIFY
  if(locktime >= 500_000_000){
    throw new Error("Locktime must be a block height (below 500,000,000), not a timestamp")
  }
  if(store.currentBlockHeight && locktime <= store.currentBlockHeight){
    throw new Error(
      `Locktime ${formatBlockHeight(locktime)} is not above the current block height (${formatBlockHeight(store.currentBlockHeight)}), so the funds would not be locked`
    )
  }

  // Confirmation summary before proposing the transaction to the wallet
  const dateEstimate = store.currentBlockHeight ?
    formatTimestamp(estimateBlockHeightTimestamp(locktime, store.currentBlockHeight)) : 'unknown'
  const confirmed = confirm(
    `You are locking ${bchAmount} BCH until block ${formatBlockHeight(locktime)}, approximately ${dateEstimate} (~10 min/block).\n\n` +
    `Until then these funds cannot be spent by anyone, including you.`
  )
  if(!confirmed) return

  const userPkh = convertAddressToPkh(store.userAddress)
  const hodlArtifactWithParams = constructArtifactWithParams(userPkh, BigInt(locktime));
  const contractOptions = { provider: store.provider, contractType: 'p2sh20' } as const
  const newHodlContract = new Contract(hodlArtifactWithParams, [], contractOptions);

  const userBchUtxos = store.userUtxos.filter(utxo =>!utxo.token)
  const userBchBalance = getBalance(userBchUtxos)

  // Calculate the amount of BCH needed for the transaction
  const feePerUserInput = 180n
  // Always add a change output back to the owner address (minimum 546 sats, the dust limit)
  // so the funding tx reveals the owner address on-chain: the EC plugin discovers contracts
  // from the owner address in the outputs, and the dapp verifies unspent contracts from it
  const minChangeAmount = 546n
  let requiredAmountSats = amountSatsNewContract + 400n + minChangeAmount

  if(userBchBalance < requiredAmountSats) throw new Error("Wallet does not have enough BCH to fund contract")

  // Sort in descending order (highest to lowest)
  userBchUtxos.sort((utxo1, utxo2) => Number(utxo2.satoshis) - Number(utxo1.satoshis))

  // Add the necessary amount of BCH UTXOs to the transaction
  const userInputUtxos = []
  let userInputTotal = 0n
  for(const userBchUtxo of userBchUtxos){
    if(userInputTotal >= requiredAmountSats) break
    userInputUtxos.push(userBchUtxo)
    userInputTotal += userBchUtxo.satoshis
    requiredAmountSats += feePerUserInput
  }

  // Re-check because the required amount grew with the fee for each added input
  if(userInputTotal < requiredAmountSats){
    throw new Error("Wallet does not have enough BCH to fund the contract plus network fees")
  }

  // Match the EC hodl plugin's opreturn format so plugin users can also discover dapp-created
  // contracts: "hodl", "<42-char unprefixed address> <version>", "<locktime as decimal string>"
  // The plugin parses the address as exactly 42 characters followed by a version number
  const unprefixedAddress = newHodlContract.address.split(':')[1]
  const opreturnData = ["hodl", `${unprefixedAddress} 1`, locktime.toString()]

  const contractOutput: Output = { to: newHodlContract.address, amount: amountSatsNewContract }
  // requiredAmountSats reserved minChangeAmount, so changeAmount is always >= 546 sats
  const changeAmount = userInputTotal - requiredAmountSats + minChangeAmount
  const changeOutput: Output = { to: store.userAddress, amount: changeAmount }

  const placeholderUnlocker = placeholderP2PKHUnlocker(store.userAddress)

  const transactionBuilder = new TransactionBuilder({provider: store.provider})
  transactionBuilder.addInputs(userInputUtxos, placeholderUnlocker)
  transactionBuilder.addOpReturnOutput(opreturnData)
  transactionBuilder.addOutput(contractOutput)
  transactionBuilder.addOutput(changeOutput)

  const wcTransactionObj = transactionBuilder.generateWcTransactionObject({
    broadcast: true,
    userPrompt: "Create HODL Contract",
  })

  const signResult = await store.signTransaction(wcTransactionObj);
  console.log(signResult);
  if (!signResult) return 
  
  const successMessage = `Successfully created a HODL contract! txid: ${signResult.signedTransactionHash}\n\n` +
    `Your contract will appear under 'User Contracts' after the transaction confirms (~10 minutes).`
  alert(successMessage);
  console.log(successMessage);

  // reset inputs
  locktimeInput.value = ''
  bchAmountInput.value = ''
  store.scanHodlContracts()
}
</script>

<template>
  <h2 style="margin-bottom: 10px;">Create HODL Contract</h2>
  <div v-if="!store.walletConnected" style="margin-top: 10px;">
    Connect your wallet
  </div>
  <div v-if="store.walletConnected">
    <input v-model="bchAmountInput" placeholder="bchamount" /> {{ network == "mainnet" ? "BCH" : "tBCH"  }} <br/>
    Current blockheight is {{ store.currentBlockHeight ? formatBlockHeight(store.currentBlockHeight) : '...' }} <br/>
    Lock until blockheight <input v-model="locktimeInput" placeholder="locktime" /><br/>
    <div style="margin-top: 4px;">
      <span v-if="!estimatedUnlock">Estimated unlock: ...</span>
      <span v-else-if="estimatedUnlock.inPast">This blockheight has already passed, the funds would not be locked</span>
      <span v-else>
        Estimated unlock: {{ estimatedUnlock.date }}
        (in {{ formatBlockHeight(estimatedUnlock.blocksRemaining!) }} blocks, {{ estimatedUnlock.duration }}, est. 10 min/block)
      </span>
    </div>
    <button @click="proposeWcTransaction" style="cursor: pointer; margin-top: 10px; padding: 4px 6px;">Create Contract</button>
  </div>
</template>