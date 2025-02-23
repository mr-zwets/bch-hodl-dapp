<script setup lang="ts">
import { ref, watch } from 'vue';
import { Contract, ElectrumNetworkProvider } from 'cashscript';
import { hexToBin, lockingBytecodeToCashAddress } from '@bitauth/libauth';
import { constructArtifactWithParams, parseOpreturn, satsToBchAmount } from '../utils/utils';
import { useStore } from '../store/store';
const store = useStore()

const pkhInput = ref('edaab961e6daaa47574fc875b67d9e5c88d4a9a6');
const userHodlContracts = ref(undefined as Contract[] | undefined);
const userContractBalances = ref(undefined as bigint[] | undefined);

const provider = new ElectrumNetworkProvider('mainnet')


function compileHodlContract(locktime: number | string, userPkh: string) {
  const hodlArtifactWithParams = constructArtifactWithParams(userPkh, BigInt(locktime) );
  const newHodlContract = new Contract(hodlArtifactWithParams, [], { provider, addressType: 'p2sh20' });
  return newHodlContract
}

async function getUserHodlContracts() {
  const listUserHodlContracts = []
  if(store.allHodlContracts == undefined) return
  for (const chaingraphItem of store.allHodlContracts) {
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
  getUserContractBalances()
}

async function getUserContractBalances(){
  if (userHodlContracts.value == undefined) return
  const balances = await Promise.all(userHodlContracts.value.map(contract => contract.getBalance()))
  console.log(balances)
  userContractBalances.value = balances
}

getUserHodlContracts()

watch(() => store.allHodlContracts, () => {
  if(store.allHodlContracts != undefined){
    getUserHodlContracts()
  }
})

</script>

<template>
  <main>
    <div>
      pubkeyhash: <input v-model="pkhInput" placeholder="locktime" style="width: 350px;"/>
    </div>
    <div>Todo: get pubkeyhash from WalletConnect</div><br/>

    <div v-if="userHodlContracts == undefined">
      Loading...
    </div>
    <div v-else-if="userHodlContracts?.length">
      Found {{ userHodlContracts?.length }} hodl {{ userHodlContracts?.length > 1 ? 'contracts' : 'contract' }} <br/>
        <div v-for="(userHodlContract, index) in userHodlContracts" :key="userHodlContract.address">
          contract address: {{ userHodlContract?.address }} <br/>
          <span v-if="userContractBalances">
            contract balance: {{ satsToBchAmount(Number(userContractBalances[index])) }}
          </span>
          <span v-else>loading...</span>
          
        </div> 
    </div>
    <div v-else>
      No hodl contracts found
    </div>

  </main>
</template>
