import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchHodlContracts } from '@/utils/chaingraph'
import type { OnChainDataHodlContract } from '@/utils/utils'

export const useStore = defineStore('store', () => {
  const allHodlContracts = ref(undefined as undefined | OnChainDataHodlContract[])

  scanHodlContracts()

  async function scanHodlContracts() {
    const chaingraphResult = await fetchHodlContracts()
    allHodlContracts.value = chaingraphResult
  }

  return {
    allHodlContracts,
    scanHodlContracts
  }
})