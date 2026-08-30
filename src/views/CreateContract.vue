<script setup lang="ts">
import { ref } from 'vue';
import { useStore } from '../store/store';
import { constructArtifactWithParams, convertAddressToPkh, convertPkhToLockingBytecode, getBalance } from '@/utils/utils';
import { Contract, placeholderP2PKHUnlocker, TransactionBuilder, type Output, type Unlocker } from 'cashscript';
import { network } from '@/config';
const store = useStore()

const locktimeInput = ref('')
const bchAmountInput = ref('')

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
      `Locktime ${locktime} is not above the current block height (${store.currentBlockHeight}), so the funds would not be locked`
    )
  }

  const userPkh = convertAddressToPkh(store.userAddress)
  const hodlArtifactWithParams = constructArtifactWithParams(userPkh, BigInt(locktime));
  const contractOptions = { provider: store.provider, contractType: 'p2sh20' } as const
  const newHodlContract = new Contract(hodlArtifactWithParams, [], contractOptions);

  const userBchUtxos = store.userUtxos.filter(utxo =>!utxo.token)
  const userBchBalance = getBalance(userBchUtxos)

  // Calculate the amount of BCH needed for the transaction
  const feePerUserInput = 180n
  let requiredAmountSats = amountSatsNewContract + 400n

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

  // Match the EC hodl plugin's opreturn format so plugin users can also discover dapp-created
  // contracts: "hodl", "<42-char unprefixed address> <version>", "<locktime as decimal string>"
  // The plugin parses the address as exactly 42 characters followed by a version number
  const unprefixedAddress = newHodlContract.address.split(':')[1]
  const opreturnData = ["hodl", `${unprefixedAddress} 1`, locktime.toString()]

  const contractOutput: Output = { to: newHodlContract.address, amount: amountSatsNewContract }
  const changeAmount =  userInputTotal - requiredAmountSats
  const changeOutput: Output = { to: store.userAddress, amount: changeAmount }

  const placeholderUnlocker = placeholderP2PKHUnlocker(store.userAddress)

  const transactionBuilder = new TransactionBuilder({provider: store.provider})
  transactionBuilder.addInputs(userInputUtxos, placeholderUnlocker)
  transactionBuilder.addOpReturnOutput(opreturnData)
  transactionBuilder.addOutput(contractOutput)
  if(changeAmount > 550n) transactionBuilder.addOutput(changeOutput)

  const wcTransactionObj = transactionBuilder.generateWcTransactionObject({
    broadcast: true,
    userPrompt: "Create HODL Contract",
  })

  const signResult = await store.signTransaction(wcTransactionObj);
  console.log(signResult);
  if (!signResult) return 
  
  const successMessage = `Succesfully create a HODL contract! txid: ${signResult.signedTransactionHash}`
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
    Current blockheight is {{ store.currentBlockHeight }} <br/>
    Lock until blockheight <input v-model="locktimeInput" placeholder="locktime" /><br/>
    <button @click="proposeWcTransaction" style="cursor: pointer; margin-top: 10px; padding: 4px 6px;">Create Contract</button>
  </div>
</template>