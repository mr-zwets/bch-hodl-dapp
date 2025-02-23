<script setup lang="ts">
import { requiredNamespaces } from "../config";
import { useStore } from '../store/store'

const store = useStore()

async function openWalletConnect(){
  if(!store.signingClient) return
  const { uri, approval } = await store.signingClient.connect({ requiredNamespaces });
  console.log(uri);
  await store.walletConnectModal.openModal({ uri });
  // Await session approval from the wallet.
  const newSession = await approval();
  store.session = newSession
  // accounts are appended with the walletconnect chain prefix bch:
  const userAccountWc = newSession.namespaces?.bch.accounts[0]
  let userAddressWc: string | undefined = userAccountWc.slice(4)
  store.userAddress = userAddressWc
    
  //onSessionConnect(session)
  // Close the QRCode modal in case it was open.
  store.walletConnectModal.closeModal();
}

async function disconnectWallet(){
  if(!store.signingClient) return
  await store.signingClient.disconnect({
    topic: store.session.topic,
    reason: { code: 0, message: "" }
  });
  // reset state in store
  store.resetSessionUserState()
}
</script>

<template>
  <button @click="openWalletConnect" class="hover" v-if="!store.walletConnected ">
    Connect wallet
  </button>
  <button @click="disconnectWallet" class="hover" v-else>
    Disconnect
  </button>
</template>

<style scoped>
  .hover{
    cursor: pointer;
  }
</style>
