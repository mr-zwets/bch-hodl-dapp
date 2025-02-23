import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import SignClient from '@walletconnect/sign-client';
import { WalletConnectModal } from '@walletconnect/modal';
import { fetchHodlContracts } from '@/utils/chaingraph'
import type { OnChainDataHodlContract } from '@/utils/utils'
import { wcModalConfig, projectId, wcMetadata } from "@/config";
import { ElectrumNetworkProvider, type Utxo } from 'cashscript';

export const useStore = defineStore('store', () => {
  // Create WC modal
  const modal = new WalletConnectModal(wcModalConfig);

  // WalletConnect global state
  const signingClient = ref(undefined as (SignClient | undefined))
  const walletConnectModal = ref(modal as (WalletConnectModal))
  const session = ref(undefined as (any))
  const walletConnected = computed(() => typeof session.value != "undefined")

  // UserInfo
  const userAddress = ref(undefined as (string | undefined))
  const userUtxos = ref(undefined as undefined | Utxo[] )
  const bchBalance = computed(() => userUtxos.value?.reduce((acc, utxo) => acc + utxo.satoshis, 0n))

  // Hodl Contracts
  const allHodlContracts = ref(undefined as undefined | OnChainDataHodlContract[])
  const currentBlockHeight = ref(undefined as undefined | number)

  // Util
  const fetchStatus = ref({
    allHodlContracts: null as Promise<void> | null,
    currentBlockHeight: null as Promise<void> | null
  })


  const provider = new ElectrumNetworkProvider('mainnet')

  initializeWalletConnect()

  fetchStatus.value.allHodlContracts = scanHodlContracts()
  fetchStatus.value.currentBlockHeight = getCurrentBlockHeight()

  function waitForConnection(): Promise<void> {
    if (walletConnected.value) return Promise.resolve()
    else {
      // watch to resolve when walletConnected is true and unwatch
      return new Promise((resolve) => {
        const unwatch = watch(walletConnected, (newValue) => {
          if (newValue) {
            unwatch()
            resolve()
          }
        })
      })
    }
  }

  async function initializeWalletConnect(){
    // Connect Client.
    // 1. Setup Client with relay server
    const signClient = await SignClient.init({
      projectId,
      // optional parameters
      relayUrl: 'wss://relay.walletconnect.com',
      metadata: wcMetadata
    });

    // Get last WalletConnect session from local storage is there is any
    const lastKeyIndex = signClient.session.getAll().length - 1;
    const lastSession = signClient.session.getAll()[lastKeyIndex];

    // Handle session events
    signClient.on('session_event', ( event ) => {
      console.log('session_event');
      console.log(event);
    });

    signClient.on('session_update', ({ params }) => {
      console.log('session_update');
      console.log(params);
    });

    signClient.on('session_delete', () => {
      console.log('session_delete');
    });

    // get last session info from local storage & ask to re-use it
    if (lastSession){
      const addressWithNamespace = lastSession.namespaces.bch.accounts[0];
      const userAddressWc = addressWithNamespace.split(':').slice(1).join(':');
      const confirmReuse = confirm("Do you want to re-connect with the WalletConnect session for: " + userAddressWc);
      if(confirmReuse){
        session.value = lastSession
        userAddress.value = userAddressWc
      }
    }

    signingClient.value = signClient
  }

  function resetSessionUserState() {
    session.value = undefined
    userAddress.value = undefined
  }

  watch(userAddress, async() => {
    if(!userAddress.value) return
    userUtxos.value = await provider.getUtxos(userAddress.value)
  })

  async function scanHodlContracts() {
    const chaingraphResult = await fetchHodlContracts()
    allHodlContracts.value = chaingraphResult
  }

  async function getCurrentBlockHeight() {
    currentBlockHeight.value = await provider.getBlockHeight()
  }

  return {
    signingClient,
    session,
    walletConnectModal,
    provider,
    userAddress,
    currentBlockHeight,
    fetchStatus,
    allHodlContracts,
    walletConnected,
    userUtxos,
    bchBalance,
    resetSessionUserState,
    waitForConnection,
    scanHodlContracts
  }
})