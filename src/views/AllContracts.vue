<script setup lang="ts">
import { useStore } from '../store/store';
const store = useStore()

</script>

<template>
  <div v-if="store.allHodlContracts == undefined">
    Loading...
  </div>
  <div v-if="store.allHodlContracts?.length">
    total HODL contract created: {{ store.allHodlContracts.length }}
  </div>
</template>