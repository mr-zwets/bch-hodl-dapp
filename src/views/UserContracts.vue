<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
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
  await loadUserContracts()
})

// Reload the user's contracts whenever the contract scan refreshes (after create/reclaim)
watch(() => store.allHodlContracts, async () => {
  await loadUserContracts()
})

async function loadUserContracts(){
  if(!store.userAddress) return
  try {
    const userPkh = convertAddressToPkh(store.userAddress)
    await getUserHodlContracts(userPkh)
  } catch (error) {
    console.error(error)
    alert(error instanceof Error ? error.message : String(error))
  }
}

function compileHodlContract(locktime: number | string, userPkh: string) {
  const hodlArtifactWithParams = constructArtifactWithParams(userPkh, BigInt(locktime) );
  const newHodlContract = new Contract(hodlArtifactWithParams, [], { provider: store.provider, contractType: 'p2sh20' });
  return newHodlContract
}

async function getUserHodlContracts(userPkh: string) {
  const listUserHodlContracts: HodlContract[] = []
  if(store.allHodlContracts == undefined) return
  for (const chaingraphItem of store.allHodlContracts) {
    // Per-item try/catch: anyone can post an opreturn with the hodl prefix, so a single
    // malformed entry should be skipped instead of breaking the whole page
    try {
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
        // A contract funded multiple times has multiple funding txs with the same address,
        // only list it once (reclaiming spends all its utxos in one transaction)
        const alreadyListed = listUserHodlContracts.some(existingContract => existingContract.address == newHodlContract.address)
        if(alreadyListed) continue
        newHodlContract.locktime = Number(locktime)
        listUserHodlContracts.push(newHodlContract)
      }
    } catch (error) {
      console.error('Skipping unparseable hodl contract entry:', error)
    }
  }
  userHodlContracts.value = listUserHodlContracts
  getUserContractBalances()
}

function isContractSpendable(locktime: number){
  // 500,000,000 is the BIP65 threshold separating block heights from timestamps
  if(locktime >= 500_000_000) return Date.now() / 1000 > locktime
  if(!store.currentBlockHeight) return false
  return locktime < store.currentBlockHeight
}

function lockedStatusText(locktime: number){
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

// Time-based locks are enforced against median-time-past, which lags wall-clock time
// by up to ~70 minutes, so a just-expired time lock can still be rejected by the network
const MTP_LAG_SECONDS = 70 * 60

async function reclaimHodlValue(locktime: number){
  if(!store.userAddress || store.userUtxos == undefined) return

  if(locktime >= 500_000_000 && Math.floor(Date.now() / 1000) - locktime < MTP_LAG_SECONDS){
    const confirmed = confirm(
      "This time lock only just expired. The network enforces time locks against 'median-time-past', " +
      "which can lag up to ~70 minutes behind the clock, so the transaction may be rejected as not ready yet.\n\n" +
      "Try to reclaim anyway? (If it fails, simply try again later)"
    )
    if(!confirmed) return
  }

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

  // Use the contract's own locktime, which satisfies OP_CHECKLOCKTIMEVERIFY for both
  // block-height and timestamp locks (same approach as the EC plugin)
  transactionBuilder.setLocktime(locktime)
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
            <span v-else-if="userContractBalances && isContractSpendable(userHodlContract.locktime)">
              funds spendable!
            </span>
            <span v-else>
              {{ lockedStatusText(userHodlContract.locktime) }}
            </span>
            <div v-if="userContractBalances && Number(userContractBalances[index]) && isContractSpendable(userHodlContract.locktime)" style="margin-top: 10px;">
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
