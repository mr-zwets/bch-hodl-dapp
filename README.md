# BCH Hodl Dapp

Web application for time locking Bitcoin Cash in a smart contract

Based on the original [hodl Electron Cash Plugin](https://github.com/mainnet-pat/hodl_ec_plugin/tree/master)

## OP_RETURN protocol & plugin interop

Contract creation announces the contract in an OP_RETURN output using the same format as the Electron Cash plugin, with three pushes:

1. `"hodl"` protocol identifier
2. `"<42-char unprefixed cashaddr of the contract> <version>"` (version is `1`)
3. the locktime (block height) as a decimal string

This means hodl contracts created with this dapp can also be discovered and spent from the Electron Cash plugin, and vice versa — even if this dapp goes offline, funds stay recoverable through the plugin. Note the plugin reconstructs contracts from the owner address in the funding transaction's outputs, so it can only discover contracts whose funding transaction included a change output back to the owner (the common case).
