import { ChaingraphClient, graphql } from "chaingraph-ts"
import type { OnChainDataHodlContract } from "./utils";

const chaingraphUrl = "https://gql.chaingraph.pat.mn/v1/graphql"

const chaingraphClient = new ChaingraphClient(chaingraphUrl)

export async function fetchHodlContracts(){
  const queryReqHodlContracts = graphql(`query {
    search_output_prefix(
      args: { locking_bytecode_prefix_hex: "6a04686f646c" }
      where: {
        transaction: {
          block_inclusions: {
            block: { accepted_by: { node: { name: { _regex: "mainnet" } } } }
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
        }
      }
    }
  }`);
  
  // TODO: add timeout to requests
  const resultQueryHodlContracts = await chaingraphClient.query(queryReqHodlContracts, {})
  
  if (!resultQueryHodlContracts.data) {
    throw new Error("No data returned from Chaingraph query");
  }
  const listContracts = resultQueryHodlContracts.data.search_output_prefix.map((output: any) => ({
    txid: output.transaction_hash.slice(2),
    opReturn: output.locking_bytecode.slice(2),
    outputs: output.transaction.outputs.map((outputInfo: any) => ({
      locking_bytecode: outputInfo.locking_bytecode.slice(2),
      value_satoshis: outputInfo.value_satoshis
    }))
  }));
  return listContracts as OnChainDataHodlContract[]
}