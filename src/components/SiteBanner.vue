<script setup lang="ts">
import { satsToBchAmount } from '@/utils/utils';
import { useStore } from '../store/store'
import { network } from '@/config'
import wcButton from "@/components/wcButton.vue"
import ThemeToggle from "@/components/ThemeToggle.vue"

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
  <header class="siteBanner">
    <div class="topBar">
      <div>
        <RouterLink class="siteName" to="/">
          <h1>BCH Hodl Dapp 💎</h1>
        </RouterLink>
        <p class="tagline">A smart contract to timelock your Bitcoin Cash!</p>
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
          <span class="selectWrap">
            <select class="networkSelect" :value="network" @change="switchNetwork" aria-label="Network">
              <option value="mainnet">mainnet</option>
              <option value="chipnet">chipnet</option>
            </select>
          </span>
          <span>
            <wcButton />
          </span>
          <ThemeToggle class="themeToggleSpacing" />
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
  color: var(--color-heading);
  padding: 0;
}
.siteName h1 {
  color: var(--color-heading);
  line-height: 1.3;
}
.tagline {
  font-size: 14px;
  color: var(--color-text);
}
.balance {
  display: flex;
  align-items: center;
}
.themeToggleSpacing {
  margin-left: 15px;
}
/* the wrapper draws the chevron, so it follows the theme's text color */
.selectWrap {
  position: relative;
  display: inline-flex;
  margin-right: 15px;
  color: var(--color-heading);
}
.selectWrap::after {
  content: "";
  position: absolute;
  right: 14px;
  top: 50%;
  width: 6px;
  height: 6px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: translateY(-70%) rotate(45deg);
  pointer-events: none;
}
.networkSelect {
  appearance: none;
  height: 32px;
  padding: 0 34px 0 14px;
  border: 1px solid var(--color-border-hover);
  border-radius: 16px;
  background: var(--color-background);
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}
.networkSelect:hover {
  background: var(--color-background-mute);
  border-color: var(--color-heading);
}
.networkSelect:focus-visible {
  outline: 2px solid #2c95d6;
  outline-offset: 2px;
}
.networkSelect option {
  background: var(--color-background);
  color: var(--color-heading);
}
.siteBanner {
  margin-bottom: 25px;
  padding: 16px 22px;
  border: 1px solid var(--color-banner-border);
  border-radius: 14px;
  background: var(--color-banner);
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