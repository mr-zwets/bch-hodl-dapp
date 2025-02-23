<script setup lang="ts">
import { ref } from 'vue';
import { useStore } from '../store/store';
import { constructArtifactWithParams, convertAddressToPkh } from '@/utils/utils';
import { Contract, TransactionBuilder } from 'cashscript';
const store = useStore()

const locktimeInput = ref('')
const bchAmountInput = ref('')

function buildTransaction(){
  if(!store.userAddress) return
  const userPkh = convertAddressToPkh(store.userAddress)
  const hodlArtifactWithParams = constructArtifactWithParams(userPkh, BigInt(locktimeInput.value));
  const contractOptions = { provider: store.provider, addressType: 'p2sh20' } as const
  const newHodlContract = new Contract(hodlArtifactWithParams, [], contractOptions);
  const transactionBuilder = new TransactionBuilder({provider: store.provider})
  transactionBuilder.addOpReturnOutput(["hodl"])
  transactionBuilder.addOutput({to: newHodlContract.address, amount: BigInt(bchAmountInput.value)})
}
</script>

<template>
  <h2 style="margin-bottom: 10px;">Create HODL Contract</h2>
  <div v-if="!store.walletConnected" style="margin-top: 10px;">
    Connect your wallet
  </div>
  <div v-if="store.walletConnected">
    <div>Currently not functional, work in progress</div>
    <input v-model="locktimeInput" placeholder="locktime" /><br/>
    <input v-model="bchAmountInput" placeholder="bchamount" /><br/>
    <button @click="buildTransaction" style="cursor: pointer;">Create Contract</button>
  </div>
</template>