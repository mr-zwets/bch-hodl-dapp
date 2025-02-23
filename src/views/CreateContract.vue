<script setup lang="ts">
import { ref } from 'vue';

const locktimeInput = ref('')
const bchAmountInput = ref('')
</script>

<template>
  <div>Create New HODL Contract</div>
  <input v-model="locktimeInput" placeholder="locktime" /><br/>
  <input v-model="bchAmountInput" placeholder="bchamount" /><br/>
  <button style="cursor: pointer;">Create Contract</button>
</template>