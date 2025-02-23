
const network = "mainnet" as ("chipnet" | "mainnet")

const connectedChain = network == "mainnet" ? "bch:bitcoincash" : "bch:bchtest";
const requiredNamespaces = {
  bch: {
    chains: [connectedChain],
    methods: ['bch_getAddresses', 'bch_signTransaction', 'bch_signMessage'],
    events: ['addressesChanged'],
  },
};

// Wallet Connect Metadata
// todo: change metadata
const wcMetadata = {
  name: 'BCH Hodl Dapp',
  description: 'Timelock your Bitcoin Cash',
  url: 'https://bch-hodl-dapp.netlify.app/',
  icons: ['https://bch-hodl-dapp.netlify.app/favicon.svg']
};

// todo: change cashninjas project id
const projectId = "2aca272d18deb10ff748260da5f78bfd";

const wcModalConfig = {
  projectId: projectId,
  themeMode: 'dark' as 'dark',
  themeVariables: {
    '--wcm-background-color': '#20c8f9',
    '--wcm-accent-color': '#20c8f9',
  },
  explorerExcludedWalletIds: 'ALL' as 'ALL'
}

const chaingraphUrl = 'https://gql.chaingraph.pat.mn/v1/graphql'

export { projectId, network, connectedChain, requiredNamespaces, wcMetadata, wcModalConfig, chaingraphUrl };