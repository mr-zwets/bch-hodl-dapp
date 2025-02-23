<script setup lang="ts">
import { formatTimestamp, parseOpreturn, satsToBchAmount } from '@/utils/utils';
import { useStore } from '../store/store';
import { ref, watch } from 'vue';
const store = useStore()

interface DisplayContracts {
  longestTimeLocks: {timelock: string, satoshis: number}[]
  biggestValue: {timelock: string, satoshis: number}[]
}

const displayContracts = ref(undefined as DisplayContracts | undefined)
const tvlContracts = ref(undefined as number | undefined)

function getDisplayContracts() {
  if(store.allHodlContracts == undefined) return

  const infoHodlContracts = []
  for(const hodlContract of store.allHodlContracts){
    const opreturnData = hodlContract.opReturn
    const locktime = parseOpreturn(opreturnData)
    const contractOutput = hodlContract.outputs.find(output => output.locking_bytecode.startsWith('a9'))
    infoHodlContracts.push({timelock: locktime, satoshis: contractOutput!.value_satoshis})
  }
  tvlContracts.value = infoHodlContracts.reduce((acc, curr) => acc + Number(curr.satoshis), 0)
  const longestTimeLocks = [...infoHodlContracts].sort((a, b) => Number(b.timelock) - Number(a.timelock)).slice(0, 3)
  const biggestValue = [...infoHodlContracts].sort((a, b) => b.satoshis - a.satoshis).slice(0, 3)
  displayContracts.value = { longestTimeLocks,biggestValue }
}

getDisplayContracts()

watch(() => store.allHodlContracts, () => {
  if(store.allHodlContracts != undefined){
    getDisplayContracts()
  }
})
</script>

<template>
  <h2 style="margin-bottom: 10px;">All HODL Contracts</h2>
  <div v-if="store.allHodlContracts == undefined">
    Loading...
  </div>
  <div v-if="store.allHodlContracts?.length && tvlContracts">
    <div>total HODL contract created: {{ store.allHodlContracts.length }}</div>
    <div>combined TVL HODL contracts: {{ satsToBchAmount(tvlContracts).toFixed(0) + ' BCH' }} </div>
    

    <div v-if="displayContracts" style="margin-top: 20px;">
      <h3 style="margin: 4px 0px;">Biggest Value</h3>
      <div style="display: flex; gap: 50px; margin-bottom: 20px;">
        <div v-for="largestContract in displayContracts.biggestValue" :key="largestContract.satoshis">
          <div>Time Lock: {{ formatTimestamp(largestContract.timelock) }}</div>
          <div>Value: {{ satsToBchAmount(largestContract.satoshis) + ' BCH' }}</div>
        </div>
      </div>
      <h3 style="margin: 4px 0px;">Longest Time Lock</h3>
      <div style="display: flex; gap: 50px;">
        <div v-for="longestTimeLock in displayContracts.longestTimeLocks" :key="longestTimeLock.timelock">
          <div>Time Lock: {{ formatTimestamp(longestTimeLock.timelock) }}</div>
          <div>Value: {{ satsToBchAmount(longestTimeLock.satoshis) + ' BCH' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>