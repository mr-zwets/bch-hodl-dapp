import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import SignClient from '@walletconnect/sign-client';
import { WalletConnectModal } from '@walletconnect/modal';
import { fetchHodlContracts } from '@/utils/chaingraph'
import type { OnChainDataHodlContract, SignedTxObject } from '../interfaces/interfaces'
import { wcModalConfig, projectId, wcMetadata, connectedChain, network } from "@/config";
import { ElectrumNetworkProvider, type Utxo, type WcTransactionObject } from 'cashscript';
import { ElectrumClient, type ElectrumNetworkOptions, type RPCNotification } from '@electrum-cash/network';
import { stringify } from '@bitauth/libauth';

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

  // Initialise the CashScript ElectrumNetworkProvider with an explicitly constructed
  // ElectrumClient (same server and options as the cashscript defaults) so the same
  // connection can also be used to subscribe to block header notifications.
  // Note: disableBrowserVisibilityHandling is a runtime option not yet in the published types
  const electrumServer = network == 'mainnet' ? 'bch.imaginary.cash' : 'chipnet.bch.ninja'
  const electrumOptions = { disableBrowserVisibilityHandling: true } as ElectrumNetworkOptions
  const electrumClient = new ElectrumClient('BCH Hodl Dapp', '1.4.1', electrumServer, electrumOptions)
  const provider = new ElectrumNetworkProvider(network, { electrum: electrumClient, manualConnectionManagement: true });
  const electrumConnected = provider.connect()

  initializeWalletConnect()

  fetchStatus.value.allHodlContracts = scanHodlContracts()
  fetchStatus.value.currentBlockHeight = subscribeToBlockHeight()

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
    // only offer sessions matching the selected network, sessions for the
    // other network would make signing requests fail
    if (lastSession && lastSession.namespaces?.bch?.accounts?.[0]?.startsWith(connectedChain)){
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

  async function signTransaction(wcTransactionObj: WcTransactionObject): Promise<SignedTxObject | undefined> {
    console.log('signTransaction')
    try {
      const result = await signingClient.value?.request({
        chainId: connectedChain,
        topic: session.value?.topic,
        request: {
          method: "bch_signTransaction",
          params: JSON.parse(stringify(wcTransactionObj)),
        },
      });
      return result as SignedTxObject;
    } catch (error) {
      console.error('Error signing transaction:', error)
      return undefined;
    }
  }

  function resetSessionUserState() {
    session.value = undefined
    userAddress.value = undefined
  }

  watch(userAddress, async() => {
    if(!userAddress.value) return
    await electrumConnected
    userUtxos.value = await provider.getUtxos(userAddress.value)
  })

  async function scanHodlContracts() {
    const chaingraphResult = await fetchHodlContracts()
    allHodlContracts.value = chaingraphResult
  }

  // Keep currentBlockHeight up to date with a block headers subscription.
  // The initial subscription response arrives as a notification too, and the client
  // automatically restores the subscription when the connection is re-established
  async function subscribeToBlockHeight() {
    await electrumConnected
    electrumClient.on('notification', (notification: RPCNotification) => {
      if(notification.method != 'blockchain.headers.subscribe') return
      const blockHeader = notification.params?.[0] as { height: number } | undefined
      if(blockHeader?.height) currentBlockHeight.value = blockHeader.height
    })
    await electrumClient.subscribe('blockchain.headers.subscribe')
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
    signTransaction,
    resetSessionUserState,
    waitForConnection,
    scanHodlContracts
  }
})