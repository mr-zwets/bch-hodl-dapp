<script setup lang="ts">
import { ref } from 'vue';
import { Contract, ElectrumNetworkProvider } from 'cashscript';
import { binToUtf8, hexToBin, lockingBytecodeToCashAddress } from '@bitauth/libauth';
import { constructArtifactWithParams, type OnChainDataHodlContract } from '../utils/utils';
import { fetchHodlContracts } from '../utils/chaingraph';

const pkhInput = ref('edaab961e6daaa47574fc875b67d9e5c88d4a9a6');
const userHodlContracts = ref(undefined as Contract[] | undefined);
const allHodlContracts = ref(undefined as OnChainDataHodlContract[] | undefined);

const provider = new ElectrumNetworkProvider('mainnet')


function compileHodlContract(locktime: number | string, userPkh: string) {
  const hodlArtifactWithParams = constructArtifactWithParams(userPkh, BigInt(locktime) );
  const newHodlContract = new Contract(hodlArtifactWithParams, [], { provider, addressType: 'p2sh20' });
  return newHodlContract
}

async function scanHodlContracts() {
  const chaingraphResult = await fetchHodlContracts()
  allHodlContracts.value = chaingraphResult
  return chaingraphResult
}

async function getUserHodlContracts() {
  const chaingraphResult = await scanHodlContracts()
  const listUserHodlContracts = []
  for (const chaingraphItem of chaingraphResult) {
    const opreturnData = chaingraphItem.opReturn
    const locktime = parseOpreturn(opreturnData)
    const newHodlContract = compileHodlContract(locktime, pkhInput.value)
    const contractOutput = chaingraphItem.outputs.find(output => output.locking_bytecode.startsWith('a9'))
    const hodlContractLockingBytecode = contractOutput!.locking_bytecode
    const hodlContractAddress = lockingBytecodeToCashAddress(
      { prefix: 'bitcoincash', bytecode: hexToBin(hodlContractLockingBytecode) }
    )
    // should not happen
    if(typeof hodlContractAddress == 'string') continue
    if(newHodlContract.address == hodlContractAddress.address){
      listUserHodlContracts.push(newHodlContract)
    }
  }
  userHodlContracts.value = listUserHodlContracts
}

function parseOpreturn(opreturnData: string) {
  const truncatedOpreturn = opreturnData.split("04686f646c")[1];
  const lengthAddressHex = truncatedOpreturn.slice(0, 2);
  const lengthAddress = parseInt(lengthAddressHex, 16);
  const truncatedOpreturn2 = truncatedOpreturn.slice(2 + lengthAddress * 2);
  const lengthLocktimeHex = truncatedOpreturn2.slice(0, 2);
  const lengthLocktime = parseInt(lengthLocktimeHex, 16);
  const locktimeEncoded = truncatedOpreturn2.slice(2, 2 + lengthLocktime * 2 );
  const locktime = binToUtf8(hexToBin(locktimeEncoded));
  return locktime;
}
getUserHodlContracts()

</script>

<template>
  <header>
    <h1>BCH Hodl Dapp 💎</h1>
    <h3>Fully compatible with the Electron-Cash Plugin!</h3>
  </header>

  <main style="margin-top: 20px">
    
    <div>
      pubkeyhash: <input v-model="pkhInput" placeholder="locktime" style="width: 350px;"/>
    </div>
    <div>Todo: get pubkeyhash from WalletConnect</div><br/>


    <div v-if="userHodlContracts?.length">
      Found {{ userHodlContracts?.length }} hodl {{ userHodlContracts?.length > 1 ? 'contracts' : 'contract' }} <br/>
        <div v-for="userHodlContract in userHodlContracts" :key="userHodlContract.address">
          contract address: {{ userHodlContract?.address }} <br/>
        </div> 
    </div>
    <div v-else-if="userHodlContracts?.length == 0">
      No hodl contracts found
    </div>

  </main>
</template>
