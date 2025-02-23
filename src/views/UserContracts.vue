<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Contract } from 'cashscript';
import { binToHex, decodeCashAddress, hexToBin, lockingBytecodeToCashAddress } from '@bitauth/libauth';
import { constructArtifactWithParams, parseOpreturn, satsToBchAmount } from '../utils/utils';
import { useStore } from '../store/store';
const store = useStore();
const userHodlContracts = ref(undefined as Contract[] | undefined);
const userContractBalances = ref(undefined as bigint[] | undefined);

onMounted(async () => {
  await store.waitForConnection()
  await store.fetchAllHodlContractsStatus
  if(!store.userAddress) return
  const userPkh = decodeCashAddress(store.userAddress)
  if(typeof userPkh == 'string') return
  await getUserHodlContracts(binToHex(userPkh.payload))
})

function compileHodlContract(locktime: number | string, userPkh: string) {
  const hodlArtifactWithParams = constructArtifactWithParams(userPkh, BigInt(locktime) );
  const newHodlContract = new Contract(hodlArtifactWithParams, [], { provider: store.provider, addressType: 'p2sh20' });
  return newHodlContract
}

async function getUserHodlContracts(userPkh: string) {
  const listUserHodlContracts = []
  if(store.allHodlContracts == undefined) return
  for (const chaingraphItem of store.allHodlContracts) {
    const opreturnData = chaingraphItem.opReturn
    const locktime = parseOpreturn(opreturnData)
    const newHodlContract = compileHodlContract(locktime, userPkh)
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

</script>

<template>
  <main>
    <h2 style="margin-bottom: 10px;">Your HODL Contracts</h2>
    <div v-if="!store.walletConnected" style="margin-top: 10px;">
      Connect your wallet
    </div>
    <div v-if="store.walletConnected">
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
        No HODL contracts found... <br/>
        Note that the dapp only checks your connected address
      </div>
    </div>

  </main>
</template>
