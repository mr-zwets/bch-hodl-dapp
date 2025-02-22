<script setup lang="ts">
import { Contract, ElectrumNetworkProvider } from 'cashscript';
import { constructArtifactWithParams } from './utils/utils';
import { ref } from 'vue';
import { binToUtf8, hexToBin } from '@bitauth/libauth';

const pubkey = ref('edaab961e6daaa47574fc875b67d9e5c88d4a9a6');
const locktimeInput = ref(''); // 715557
const txidInput = ref('');
const hodlContract = ref(undefined as Contract | undefined);
const contractBalance = ref(0n);

const provider = new ElectrumNetworkProvider('mainnet')

function initializeContract() {
  let locktime
  if(!locktimeInput.value && txidInput.value){
    locktime = parseFundingTx()
  }
  const hodlArtifactWithParams = constructArtifactWithParams(pubkey.value, BigInt(locktimeInput.value) );
  const newHodlContract = new Contract(hodlArtifactWithParams, [], { provider, addressType: 'p2sh20' });
  hodlContract.value = newHodlContract;
  getContractBalance()
}

async function getContractBalance() {
  const balance = await hodlContract.value!.getBalance();
  contractBalance.value = balance;
}

async function parseFundingTx() {
  const tx = await provider.getRawTransaction(txidInput.value);
  const truncatedTx = tx.split("04686f646c")[1];
  const lengthAddressHex = truncatedTx.slice(0, 2);
  const lengthAddress = parseInt(lengthAddressHex, 16);
  const truncatedTx2 = truncatedTx.slice(2 + lengthAddress * 2);
  const lengthLocktimeHex = truncatedTx2.slice(0, 2);
  const lengthLocktime = parseInt(lengthLocktimeHex, 16);
  const locktimeEncoded = truncatedTx2.slice(2, 2 + lengthLocktime * 2 );
  const locktime = binToUtf8(hexToBin(locktimeEncoded));
  return locktime;
}

</script>

<template>
  <header>
    <h1>BCH Hodl Dapp 💎</h1>
    <h3>Compatible with the Electron-Cash Plugin</h3>
  </header>

  <main style="margin-top: 20px">
    <div>... todo: get pubkey from WalletConnect</div><br/>

    Either provide the contract's locktime: <br/>
    <input v-model="locktimeInput" placeholder="locktime" style="width: 200px;"/><br/>
    or provide the funding txid:
    <input v-model="txidInput" placeholder="txid" style="width: 350px;"/><br/>
    <button @click="initializeContract">Initialize Contract</button><br/>

    <div v-if="hodlContract">
      contract address: {{ hodlContract?.address }} <br/>
      contract balance: {{ contractBalance }} sats
    </div> 
  </main>
</template>
