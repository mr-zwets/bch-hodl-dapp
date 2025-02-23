<script setup lang="ts">
import { ref } from 'vue';
import { useStore } from '../store/store';
const store = useStore()

const locktimeInput = ref('')
const bchAmountInput = ref('')
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
    <button style="cursor: pointer;">Create Contract</button>
  </div>
</template>