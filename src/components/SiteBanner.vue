<script setup lang="ts">
import { satsToBchAmount } from '@/utils/utils';
import { useStore } from '../store/store'
import { network } from '@/config'
import wcButton from "@/components/wcButton.vue"

const store = useStore()

function switchNetwork(event: Event){
  const selectedNetwork = (event.target as HTMLSelectElement).value
  if(selectedNetwork == network) return
  localStorage.setItem('network', selectedNetwork)
  // The network is fixed at startup (electrum connection, walletconnect chain, provider),
  // so switching requires a page reload
  location.reload()
}
</script>

<template>
  <header style="margin-bottom: 25px">
    <div class="topBar">
      <div>
        <RouterLink class="siteName" to="/">
          <h1>BCH Hodl Dapp 💎</h1>
        </RouterLink>
        <h3 class="tagline">A smart contract to timelock your Bitcoin Cash!</h3>
      </div>
      <div class="navContainer">
        <nav style="display: flex; gap: 20px;">
          <RouterLink to="/">All Contracts</RouterLink>
          <RouterLink to="/my-contracts">User Contracts</RouterLink>
          <RouterLink to="/create-contract">Create Contract</RouterLink>
          <RouterLink to="/about">About</RouterLink>
        </nav>
      </div>
      <div class="wcContainer">
        <div class="balance">
          <select class="networkSelect" :value="network" @change="switchNetwork">
            <option value="mainnet">mainnet</option>
            <option value="chipnet">chipnet</option>
          </select>
          <span>
            <wcButton />
          </span>
        </div>
        <div v-if="store.userAddress" style="margin-top: 5px;">
          Balance: <span v-if="store.bchBalance !== undefined">{{ satsToBchAmount(Number(store.bchBalance)) }} BCH</span>
          <span v-else>loading...</span>
        </div>
        <div class="address" v-if="store.userAddress">
          {{ store.userAddress.slice(0,22) + "..." + store.userAddress.slice(-8)}}
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
a {
  color: black;
  padding: 0;
}
.networkSelect {
  margin-right: 15px;
  cursor: pointer;
}
.topBar {
  display: flex;
  align-items: flex-start;
  gap: 60px;
}
.topBar nav a {
  white-space: nowrap;
}
.tagline {
  white-space: nowrap;
}
.navContainer{
  margin-top: 12px;
}
.wcContainer{
  margin-top: 12px;
  margin-left: auto;
}
@media only screen and (max-width: 1000px) {
  .topBar {
    flex-direction: column;
    gap: 0px;
  }
  .tagline {
    white-space: normal;
  }
  .navContainer {
    margin-top: 10px;
  }
  .wcContainer{
    margin: 10px 0;
    margin-left: 0;
  }
}
</style>