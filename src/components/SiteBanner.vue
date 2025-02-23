<script setup lang="ts">
import { satsToBchAmount } from '@/utils/utils';
import { useStore } from '../store/store'
import wcButton from "@/components/wcButton.vue"

const store = useStore()
</script>

<template>
  <header style="margin-bottom: 25px">
    <div style="display: flex; align-items: center;" class="topBar">
      <RouterLink class="siteName" to="/">
        <h1>BCH Hodl Dapp 💎</h1>
      </RouterLink>
      <div class="navContainer">
        <nav style="display: flex; gap: 20px;">
          <RouterLink to="/">All Contracts</RouterLink>
          <RouterLink to="/my-contracts">User Contracts</RouterLink>
          <RouterLink to="/create-contract">Create Contract</RouterLink>
        </nav>
      </div>
      <div class="wcContainer">
        <div class="balance">
          <span>
            <wcButton />
          </span>
          <span style="margin-left: 20px; width: 220px;" v-if="store.userAddress">
            Balance: <span v-if="store.bchBalance !== undefined">
              <span>{{ satsToBchAmount(Number(store.bchBalance)).toFixed(2) }} BCH </span>
            </span><span v-else> loading...</span>
          </span>
        </div>
        <div class="address" v-if="store.userAddress">
          {{ store.userAddress.slice(0,28) + "..." + store.userAddress.slice(-10)}}
        </div>
      </div>
    </div>
    <h3>A smart contract to timelock your Bitcoin Cash!</h3>
  </header>
</template>

<style scoped>
a {
  color: black;
  padding: 0;
}
.navContainer{
  margin-left: 150px;
}
.wcContainer{
  margin-left: 150px;
}
@media only screen and (max-width: 1300px) {
  .topBar {
    justify-content: space-between;
  }
  .navContainer {
    margin-left: 0px;
  }
  .wcContainer {
    margin-left: 0px;
  }
}
@media only screen and (max-width: 1000px) {
  .topBar {
    flex-direction: column;
    align-items: flex-start;
  }
  .navContainer {
    margin-left: 0;
  }
  .wcContainer{
    margin-left: 0px;
    margin: 10px 0;
  }
}
</style>