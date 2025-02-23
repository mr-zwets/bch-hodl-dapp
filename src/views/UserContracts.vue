<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Contract, type Unlocker, type Output, TransactionBuilder, SignatureTemplate  } from 'cashscript';
import { binToHex, decodeCashAddress, decodeTransaction, hexToBin, lockingBytecodeToCashAddress} from '@bitauth/libauth';
import { constructArtifactWithParams, convertAddressToPkh, formatTimestamp, parseOpreturn, satsToBchAmount } from '../utils/utils';
import { useStore } from '../store/store';
import { network } from '@/config';
import { generateSourceOutputs, type signedTxObject } from '@/utils/wcUtils';
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

async function getUserContractBalances(){
  if (userHodlContracts.value == undefined) return
  const balances = await Promise.all(userHodlContracts.value.map(contract => contract.getBalance()))
  userContractBalances.value = balances
}

async function unlockHodlVault(locktime: number){
  if(!store.userAddress || store.userUtxos == undefined || !store.currentBlockHeight) return

  const userPkh = convertAddressToPkh(store.userAddress)
  const hodlArtifactWithParams = constructArtifactWithParams(userPkh, BigInt(locktime));
  const contractOptions = { provider: store.provider, addressType: 'p2sh20' } as const
  const hodlContract = new Contract(hodlArtifactWithParams, [], contractOptions);

  const contractUtxos = await hodlContract.getUtxos()

  // TODO: support multipl contract UTXOs
  if(contractUtxos.length != 1) throw new Error("Only one contract UTXO supported")
  const contractUtxo = contractUtxos[0]

  const reclaimAmount = contractUtxo.satoshis - 500n
  const reclaimOutput: Output = { to: store.userAddress, amount: reclaimAmount }

  const placeholderSig = new SignatureTemplate(Uint8Array.from(Array(32)));
  const placeholderPubKey = Uint8Array.from(Array(33));

  const transactionBuilder = new TransactionBuilder({provider: store.provider})

  transactionBuilder.setLocktime(store.currentBlockHeight)
  transactionBuilder.addInput(contractUtxo, hodlContract.unlock.spend(placeholderPubKey, placeholderSig))
  transactionBuilder.addOutput(reclaimOutput)

  const unsignedRawTransactionHex = transactionBuilder.build();

  const decodedTransaction = decodeTransaction(hexToBin(unsignedRawTransactionHex));
  if(typeof decodedTransaction == "string") throw new Error("!decodedTransaction")

  const sourceOutputs = generateSourceOutputs(transactionBuilder.inputs)

  const wcSourceOutputs = sourceOutputs.map((sourceOutput, index) => {
    return { ...sourceOutput, ...decodedTransaction.inputs[index] }
  })

  const wcTransactionObj = {
    transaction: decodedTransaction,
    sourceOutputs: wcSourceOutputs,
    broadcast: true,
    userPrompt: "Reclaim HODL Value",
  };

  const signResult = await store.signTransaction(wcTransactionObj) as (signedTxObject | undefined);
  console.log(signResult);
  if (!signResult) return 

  const successMessage = `Succesfully reclaimed HODLed value! txid: ${signResult.signedTransactionHash}`
  alert(successMessage);
  console.log(successMessage);
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
          <div v-for="(userHodlContract, index) in userHodlContracts" :key="userHodlContract.address" style="margin: 5px 0;">
            contract address: {{ userHodlContract?.address }} <br/>
            contract balance: <span v-if="userContractBalances">
               {{ satsToBchAmount(Number(userContractBalances[index])) +  network == "mainnet" ? "BCH" : "tBCH"  }}
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
            <div v-if="userContractBalances && store.currentBlockHeight && userHodlContract.locktime < store.currentBlockHeight" style="margin-top: 10px;">
              <button @click="() => unlockHodlVault(userHodlContract.locktime)" style="cursor: pointer;">
                Reclaim To Wallet
              </button>
            </div>
          </div>

      </div>
      <div v-else>
        No HODL contracts found... <br/>
        Note that the dapp only checks your connected address
      </div>
    </div>

  </main>
</template>
