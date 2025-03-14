<script setup lang="ts">
import { formatTimestamp, parseOpreturn, satsToBchAmount } from '@/utils/utils';
import { useStore } from '../store/store';
import { computed, ref, watch } from 'vue';
import { network } from '@/config';
const store = useStore()

interface DisplayContracts {
  longestTimeLocks: {timelock: string, satoshis: number}[]
  biggestValue: {timelock: string, satoshis: number}[]
}

interface ActiveHodlContract {
  timelock: string
  satoshis: number
  isSpent: boolean
}

const displayContracts = ref(undefined as DisplayContracts | undefined)
const activeContracts = ref(undefined as ActiveHodlContract[] | undefined)
const tvlContracts = ref(undefined as number | undefined)
const tvlActiveContracts = computed(() => {
  if(activeContracts.value == undefined) return
  return activeContracts.value.reduce((acc, curr) => acc + Number(curr.satoshis), 0)
})

function getDisplayContracts() {
  if(store.allHodlContracts == undefined) return

  const infoHodlContracts = []
  for(const hodlContract of store.allHodlContracts){
    const opreturnData = hodlContract.opReturn
    const locktime = parseOpreturn(opreturnData)
    const contractOutput = hodlContract.outputs.find(output => output.locking_bytecode.startsWith('a9'))
    infoHodlContracts.push({timelock: locktime, satoshis: contractOutput!.value_satoshis, isSpent: contractOutput!.spent})
  }
  tvlContracts.value = infoHodlContracts.reduce((acc, curr) => acc + Number(curr.satoshis), 0)
  activeContracts.value = infoHodlContracts.filter(contract => !contract.isSpent)
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
  <div v-if="store.allHodlContracts != undefined && tvlContracts != undefined">
    <div v-if="network == 'chipnet'" style="margin-bottom: 10px;">Currently connected to Chipnet for testing</div>
    <div>Active HODL contracts: {{ activeContracts?.length }}</div>
    <div>Current TVL HODL contracts: 
      <span v-if="tvlActiveContracts">
        {{ satsToBchAmount(tvlActiveContracts).toFixed(0)}} {{ network == "mainnet" ? "BCH" : "tBCH"  }}
      </span>
    </div>
    <br/>
    <div>Total HODL contract created: {{ store.allHodlContracts.length }}</div>
    <div>Total TVL HODL contracts:
      {{ satsToBchAmount(tvlContracts).toFixed(0) }} {{ network == "mainnet" ? "BCH" : "tBCH"  }}
    </div>

    <div v-if="displayContracts" style="margin-top: 20px;">
      <h3 style="margin: 4px 0px;">Biggest Value</h3>
      <div style="display: flex; gap: 50px; margin-bottom: 20px;">
        <div v-for="largestContract in displayContracts.biggestValue" :key="largestContract.satoshis">
          <div>Time Lock: {{ formatTimestamp(largestContract.timelock) }}</div>
          <div>Value: {{ satsToBchAmount(largestContract.satoshis) }} {{ network == "mainnet" ? "BCH" : "tBCH"  }}</div>
        </div>
      </div>
      <h3 style="margin: 4px 0px;">Longest Time Lock</h3>
      <div style="display: flex; gap: 50px;">
        <div v-for="longestTimeLock in displayContracts.longestTimeLocks" :key="longestTimeLock.timelock">
          <div>Time Lock: {{ formatTimestamp(longestTimeLock.timelock) }}</div>
          <div>Value: {{ satsToBchAmount(longestTimeLock.satoshis) }} {{ network == "mainnet" ? "BCH" : "tBCH"  }}</div>
        </div>
      </div>
    </div>
  </div>
</template>