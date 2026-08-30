<template>
  <main>
    <h2 style="margin-bottom: 10px;">About</h2>
    <div class="aboutSection">
      The BCH Hodl Dapp lets you timelock Bitcoin Cash in a smart contract.
      Locked funds are provably unspendable, even by you, until the block height you chose is reached.
    </div>

    <h3>Works with all BCH WalletConnect wallets</h3>
    <div class="aboutSection">
      This dapp uses the same on-chain contract and announcement format as the original
      <a href="https://github.com/mainnet-pat/hodl_ec_plugin" target="_blank" rel="noopener">HODL plugin for Electron Cash</a>,
      so contracts created in one are discoverable and spendable in the other.
      The plugin requires the Electron Cash desktop wallet, while this dapp connects through WalletConnect:
      any BCH wallet supporting it (like Cashonize, Zapit or Paytaca) can create and reclaim HODL contracts.
      Your keys stay in your wallet, the dapp only proposes transactions for your wallet to sign.
    </div>

    <h3>Network-wide overview</h3>
    <div class="aboutSection">
      The <RouterLink to="/">All Contracts</RouterLink> page is unique to this dapp: it shows every HODL contract
      on the network, with the total value locked, the biggest values and the longest timelocks.
      The stats are verified on-chain instead of trusting what contract creators announce.
    </div>

    <h3>Timelocks as a security measure</h3>
    <div class="aboutSection">
      A HODL contract is a possible defensive measure against the "$5 wrench attack".
      Keeping your coins timelocked gives you a provable way to refuse handing over your funds to a robber:
      the funds cannot move before the timelock expires.
    </div>

    <h3>History</h3>
    <div class="aboutSection">
      This dapp was originally built in 24 hours as a blueprint for how quickly you can build smart contract
      apps on BCH with CashScript and WalletConnect, see the video
      <a href="https://www.youtube.com/watch?v=JJZq3bXMNIw" target="_blank" rel="noopener">"Want to Build a BCH DApp? Here's my Blueprint!"</a>.
      It helped demonstrate the CashScript WalletConnect helpers and serves as an open source
      <a href="https://github.com/mr-zwets/bch-hodl-dapp" target="_blank" rel="noopener">code example on GitHub</a>.
      Mainnet support was added in August 2026 after a security review.
    </div>
  </main>
</template>

<style scoped>
h3 {
  margin: 20px 0 6px 0;
}
.aboutSection {
  max-width: 750px;
}
</style>
