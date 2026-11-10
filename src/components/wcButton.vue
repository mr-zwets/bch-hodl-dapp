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
  <button @click="openWalletConnect" class="wcButton" v-if="!store.walletConnected">
    Connect wallet
  </button>
  <button @click="disconnectWallet" class="wcButton secondary" v-else>
    Disconnect
  </button>
</template>

<style scoped>
.wcButton {
  height: 32px;
  padding: 0 16px;
  border: 1px solid #2c95d6;
  border-radius: 16px;
  background: #2c95d6;
  color: #fff;
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}
.wcButton:hover {
  background: #2380ba;
  border-color: #2380ba;
}
.wcButton:focus-visible {
  outline: 2px solid #2c95d6;
  outline-offset: 2px;
}
/* disconnect is the less prominent action, so it is outlined */
.wcButton.secondary {
  background: transparent;
  border-color: var(--color-border-hover);
  color: var(--color-heading);
}
.wcButton.secondary:hover {
  background: var(--color-background-mute);
  border-color: var(--color-heading);
}
</style>
