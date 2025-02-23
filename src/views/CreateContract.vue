<script setup lang="ts">
import { ref } from 'vue';
import { useStore } from '../store/store';
import { constructArtifactWithParams, convertAddressToPkh, convertPkhToLockingBytecode, getBalance } from '@/utils/utils';
import { Contract, TransactionBuilder, type Output, type Unlocker } from 'cashscript';
import { decodeTransaction, hexToBin } from '@bitauth/libauth';
import { generateSourceOutputs, type signedTxObject } from '@/utils/wcUtils';
import { network } from '@/config';
const store = useStore()

const locktimeInput = ref('')
const bchAmountInput = ref('')

async function proposeWcTransaction(){
  if(!store.userAddress || store.userUtxos == undefined) return

  const amountSatsNewContract = BigInt(Number(bchAmountInput.value) * 100_000_000)

  const userPkh = convertAddressToPkh(store.userAddress)
  const hodlArtifactWithParams = constructArtifactWithParams(userPkh, BigInt(locktimeInput.value));
  const contractOptions = { provider: store.provider, addressType: 'p2sh20' } as const
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

  const opreturnData = ["hodl", newHodlContract.address, locktimeInput.value]

  const contractOutput: Output = { to: newHodlContract.address, amount: amountSatsNewContract }
  const changeAmount =  userInputTotal - requiredAmountSats
  const changeOutput: Output = { to: store.userAddress, amount: changeAmount }

  const placeholderUnlocker: Unlocker = {
    generateLockingBytecode: () => convertPkhToLockingBytecode(userPkh),
    generateUnlockingBytecode: () => Uint8Array.from(Array(0))
  }

  const transactionBuilder = new TransactionBuilder({provider: store.provider})
  transactionBuilder.addInputs(userInputUtxos, placeholderUnlocker)
  transactionBuilder.addOpReturnOutput(opreturnData)
  transactionBuilder.addOutputs([contractOutput, changeOutput])
  
  const unsignedRawTransactionHex = transactionBuilder.build();

  const decodedTransaction = decodeTransaction(hexToBin(unsignedRawTransactionHex));
  if(typeof decodedTransaction == "string") throw new Error("!decodedTransaction")

  const sourceOutputs = generateSourceOutputs(transactionBuilder.inputs)

  const wcSourceOutputs = sourceOutputs.map((sourceOutput, index) => {
    return { ...sourceOutput, ...decodedTransaction.inputs[index] }
  })

  const wcTransactionObj = {
    transaction: decodedTransaction,
    sourceOutputs: wcSourceOutputs,
    broadcast: true,
    userPrompt: "Create HODL Contract",
  };

  const signResult = await store.signTransaction(wcTransactionObj) as (signedTxObject | undefined);
  console.log(signResult);
  if (!signResult) return 
  
  const successMessage = `Succesfully create a HODL contract! txid: ${signResult.signedTransactionHash}`
  alert(successMessage);
  console.log(successMessage);
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