<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Contract, type Output, placeholderPublicKey, placeholderSignature, TransactionBuilder  } from 'cashscript';
import { hexToBin, lockingBytecodeToCashAddress} from '@bitauth/libauth';
import { constructArtifactWithParams, convertAddressToPkh, estimateBlockHeightTimestamp, formatTimestamp, getBalance, parseOpreturn, satsToBchAmount } from '../utils/utils';
import { useStore } from '../store/store';
import { network } from '@/config';
const store = useStore();

interface HodlContract extends ReturnType<typeof compileHodlContract>{
  locktime: number;
}

const userHodlContracts = ref(undefined as HodlContract[] | undefined);
const userContractBalances = ref(undefined as bigint[] | undefined);

onMounted(async () => {
  await store.waitForConnection()
  await Promise.all([
    store.fetchStatus.allHodlContracts,
    store.fetchStatus.currentBlockHeight
  ])
  if(!store.userAddress) return
  try {
    const userPkh = convertAddressToPkh(store.userAddress)
    await getUserHodlContracts(userPkh)
  } catch (error) {
    console.error(error)
    alert(error instanceof Error ? error.message : String(error))
  }
})

function compileHodlContract(locktime: number | string, userPkh: string) {
  const hodlArtifactWithParams = constructArtifactWithParams(userPkh, BigInt(locktime) );
  const newHodlContract = new Contract(hodlArtifactWithParams, [], { provider: store.provider, contractType: 'p2sh20' });
  return newHodlContract
}

async function getUserHodlContracts(userPkh: string) {
  const listUserHodlContracts = []
  if(store.allHodlContracts == undefined) return
  for (const chaingraphItem of store.allHodlContracts) {
    const opreturnData = chaingraphItem.opReturn
    const locktime = parseOpreturn(opreturnData)
    const newHodlContract = compileHodlContract(locktime, userPkh) as HodlContract
    const contractOutput = chaingraphItem.outputs.find(output => output.locking_bytecode.startsWith('a9'))
    const prefix = network == 'mainnet' ? 'bitcoincash' : 'bchtest'
    const hodlContractLockingBytecode = hexToBin(contractOutput!.locking_bytecode)
    const hodlContractAddress = lockingBytecodeToCashAddress({ prefix, bytecode: hodlContractLockingBytecode})
    // should not happen
    if(typeof hodlContractAddress == 'string') continue
    if(newHodlContract.address == hodlContractAddress.address){
    newHodlContract.locktime = Number(locktime)
      listUserHodlContracts.push(newHodlContract)
    }
  }
  userHodlContracts.value = listUserHodlContracts
  getUserContractBalances()
}

function lockedStatusText(locktime: number){
  // Timestamp-based locks (from plugin-created contracts) cannot be unlocked through the dapp
  if(locktime >= 500_000_000) return `locked until ${formatTimestamp(locktime)} (time-based lock)`
  if(!store.currentBlockHeight) return 'locked'
  const blocksRemaining = locktime - store.currentBlockHeight
  const daysLeft = Math.ceil(blocksRemaining * 10 / (60 * 24))
  const dateEstimate = formatTimestamp(estimateBlockHeightTimestamp(locktime, store.currentBlockHeight))
  return `locked until block ${locktime} (~${dateEstimate}, ~${daysLeft} ${daysLeft == 1 ? 'day' : 'days'} left)`
}

async function getUserContractBalances(){
  if (userHodlContracts.value == undefined) return
  const balances = await Promise.all(userHodlContracts.value.map(contract => contract.getBalance()))
  console.log(balances)
  userContractBalances.value = balances
}

async function unlockHodlVault(locktime: number){
  try {
    await reclaimHodlValue(locktime)
  } catch (error) {
    console.error(error)
    alert(error instanceof Error ? error.message : String(error))
  }
}

async function reclaimHodlValue(locktime: number){
  if(!store.userAddress || store.userUtxos == undefined || !store.currentBlockHeight) return

  const userPkh = convertAddressToPkh(store.userAddress)
  const hodlArtifactWithParams = constructArtifactWithParams(userPkh, BigInt(locktime));
  const contractOptions = { provider: store.provider, contractType: 'p2sh20' } as const
  const hodlContract = new Contract(hodlArtifactWithParams, [], contractOptions);

  const contractUtxos = await hodlContract.getUtxos()
  const contractBalance = getBalance(contractUtxos)

  // 150 base + 200 per input stays above the 1 sat/byte relay fee for any number of inputs
  // (~78 bytes fixed tx size, ~172 bytes per contract input with schnorr sig + redeem script)
  const reclaimFee = 150n + 200n * BigInt(contractUtxos.length)
  const reclaimAmount = contractBalance - reclaimFee
  if(reclaimAmount < 546n) throw new Error("Contract balance is too small to cover the network fee for reclaiming")
  const reclaimOutput: Output = { to: store.userAddress, amount: reclaimAmount }

  const placeholderSig = placeholderSignature()
  const placeholderPubKey = placeholderPublicKey();

  const transactionBuilder = new TransactionBuilder({provider: store.provider})

  transactionBuilder.setLocktime(store.currentBlockHeight)
  // needed for typescript
  if (!hodlContract.unlock?.spend) {
    throw new Error("hodlContract.unlock.spend is undefined");
  }
  transactionBuilder.addInputs(contractUtxos, hodlContract.unlock.spend(placeholderPubKey, placeholderSig))
  transactionBuilder.addOutput(reclaimOutput)

  const wcTransactionObj = transactionBuilder.generateWcTransactionObject({
    broadcast: true,
    userPrompt: "Reclaim HODL Value",
  })

  const signResult = await store.signTransaction(wcTransactionObj);
  console.log(signResult);
  if (!signResult) return 

  const successMessage = `Successfully reclaimed HODLed value! txid: ${signResult.signedTransactionHash}`
  alert(successMessage);
  console.log(successMessage);

  store.scanHodlContracts()
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
        Found {{ userHodlContracts?.length }} hodl {{ userHodlContracts?.length > 1 ? 'contracts' : 'contract' }}:
          <div v-for="(userHodlContract, index) in userHodlContracts" :key="userHodlContract.address" style="margin: 14px 0;">
            contract address: {{ userHodlContract?.address }} <br/>
            contract balance: <span v-if="userContractBalances">
              {{ satsToBchAmount(Number(userContractBalances[index])) }} {{ network == "mainnet" ? "BCH" : "tBCH" }}
            </span>
            <span v-else>loading...</span><br/>
            contract locktime: {{ formatTimestamp(userHodlContract?.locktime) }} <br/>
            status: <span v-if="!userContractBalances || !store.currentBlockHeight">loading...</span>
            <span v-else-if="userContractBalances && Number(userContractBalances[index]) == 0">
              funds spent
            </span>
            <span v-else-if="userContractBalances && userHodlContract.locktime < store.currentBlockHeight">
              funds spendable!
            </span>
            <span v-else>
              {{ lockedStatusText(userHodlContract.locktime) }}
            </span>
            <div v-if="userContractBalances && Number(userContractBalances[index]) && store.currentBlockHeight && userHodlContract.locktime < store.currentBlockHeight" style="margin-top: 10px;">
              <button @click="() => unlockHodlVault(userHodlContract.locktime)" style="cursor: pointer;">
                Reclaim To Wallet
              </button>
            </div>
          </div>

      </div>
      <div v-else>
        No HODL contracts found... <br/>
        Newly created contracts appear here after their transaction confirms (~10 minutes). <br/>
        Note that the dapp only checks your connected address — contracts created for a different address in the same wallet won't show.
      </div>
    </div>

  </main>
</template>
