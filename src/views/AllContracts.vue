<script setup lang="ts">
import { formatTimestamp, satsToBchAmount } from '@/utils/utils';
import { verifyHodlContract } from '@/utils/verifyHodlContract';
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
const unverifiedContracts = ref(0)
const verifiedContracts = ref(0)
const tvlActiveContracts = computed(() => {
  if(activeContracts.value == undefined) return
  return activeContracts.value.reduce((acc, curr) => acc + Number(curr.satoshis), 0)
})

function getDisplayContracts() {
  if(store.allHodlContracts == undefined) return

  const infoHodlContracts = []
  let countUnverified = 0
  for(const hodlContract of store.allHodlContracts){
    const verifiedContract = verifyHodlContract(hodlContract)
    if(!verifiedContract){
      countUnverified += 1
      continue
    }
    infoHodlContracts.push({
      timelock: verifiedContract.locktime.toString(),
      satoshis: verifiedContract.satoshis,
      isSpent: verifiedContract.isSpent
    })
  }
  unverifiedContracts.value = countUnverified
  verifiedContracts.value = infoHodlContracts.length
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
    <div v-if="network == 'chipnet'" style="margin-bottom: 10px;">Connected to Chipnet, a test network — tBCH has no real value</div>

    <div class="statGrid">
      <div class="card">
        <div class="statLabel">Active HODL contracts</div>
        <div class="statValue">{{ activeContracts?.length }}</div>
      </div>
      <div class="card">
        <div class="statLabel">Current TVL HODL contracts</div>
        <div class="statValue" v-if="tvlActiveContracts != undefined">
          {{ satsToBchAmount(tvlActiveContracts).toLocaleString('en-US', { maximumFractionDigits: 0 }) }} {{ network == "mainnet" ? "BCH" : "tBCH"  }}
        </div>
      </div>
      <div class="card">
        <div class="statLabel">Total HODL contracts created</div>
        <div class="statValue">{{ verifiedContracts }}</div>
      </div>
      <div class="card">
        <div class="statLabel">Total TVL HODL contracts</div>
        <div class="statValue">
          {{ satsToBchAmount(tvlContracts).toLocaleString('en-US', { maximumFractionDigits: 0 }) }} {{ network == "mainnet" ? "BCH" : "tBCH"  }}
        </div>
      </div>
    </div>
    <div v-if="unverifiedContracts" class="note">
      Excluded {{ unverifiedContracts }} {{ unverifiedContracts > 1 ? 'entries' : 'entry' }} which could not be verified on-chain
    </div>

    <div v-if="displayContracts">
      <h3 class="sectionTitle">Biggest Value</h3>
      <div class="contractGrid">
        <div class="card" v-for="(largestContract, index) in displayContracts.biggestValue" :key="index">
          <div class="rank">#{{ index + 1 }}</div>
          <div class="row"><span class="statLabel">Value</span> <strong>{{ satsToBchAmount(largestContract.satoshis) }} {{ network == "mainnet" ? "BCH" : "tBCH"  }}</strong></div>
          <div class="row"><span class="statLabel">Time Lock</span> {{ formatTimestamp(largestContract.timelock) }}</div>
        </div>
      </div>
      <h3 class="sectionTitle">Longest Time Lock</h3>
      <div class="contractGrid">
        <div class="card" v-for="(longestTimeLock, index) in displayContracts.longestTimeLocks" :key="index">
          <div class="rank">#{{ index + 1 }}</div>
          <div class="row"><span class="statLabel">Time Lock</span> <strong>{{ formatTimestamp(longestTimeLock.timelock) }}</strong></div>
          <div class="row"><span class="statLabel">Value</span> {{ satsToBchAmount(longestTimeLock.satoshis) }} {{ network == "mainnet" ? "BCH" : "tBCH"  }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  position: relative;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background-soft);
}
.statGrid,
.contractGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  max-width: 960px;
}
.contractGrid {
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}
.statLabel {
  font-size: 13px;
  opacity: 0.8;
}
.statValue {
  margin-top: 2px;
  font-size: 22px;
  font-weight: 600;
  color: var(--color-heading);
}
.note {
  margin-top: 10px;
  font-size: 13px;
  opacity: 0.8;
}
.sectionTitle {
  margin: 28px 0 10px 0;
  color: var(--color-heading);
}
.rank {
  position: absolute;
  top: 12px;
  right: 14px;
  font-size: 13px;
  font-weight: 600;
  color: #2c95d6;
}
.row {
  display: flex;
  gap: 8px;
  align-items: baseline;
}
.row .statLabel {
  min-width: 70px;
}
strong {
  font-weight: 600;
  color: var(--color-heading);
}
</style>
