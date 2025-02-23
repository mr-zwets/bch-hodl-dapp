import { ChaingraphClient, graphql } from "chaingraph-ts"
import type { OnChainDataHodlContract } from "../interfaces/interfaces";
import { chaingraphUrl, network } from "@/config";

const chaingraphClient = new ChaingraphClient(chaingraphUrl)

export async function fetchHodlContracts(){
  const queryReqHodlContracts = graphql(`query hodlContracts(
    $network: String
  ){
    search_output_prefix(
      args: { locking_bytecode_prefix_hex: "6a04686f646c" }
      where: {
        transaction: {
          block_inclusions: {
            block: { accepted_by: { node: { name: { _regex: $network } } } }
          }
        }
      }
    ) {
      transaction_hash
      locking_bytecode
      transaction {
        outputs {
          locking_bytecode
          value_satoshis
          spent_by {
            outpoint_transaction_hash
        }
        }
      }
    }
  }`);
  
  // TODO: add timeout to requests
  const resultQueryHodlContracts = await chaingraphClient.query(queryReqHodlContracts, {network})
  
  if (!resultQueryHodlContracts.data) {
    throw new Error("No data returned from Chaingraph query");
  }
  const listContracts = resultQueryHodlContracts.data.search_output_prefix.map((output: any) => ({
    txid: output.transaction_hash.slice(2),
    opReturn: output.locking_bytecode.slice(2),
    outputs: output.transaction.outputs.map((outputInfo: any) => ({
      locking_bytecode: outputInfo.locking_bytecode.slice(2),
      value_satoshis: outputInfo.value_satoshis,
      spent: !outputInfo.spent_by.length
    }))
  }));
  return listContracts as OnChainDataHodlContract[]
}