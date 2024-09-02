# Acala Wormhole Relayer
[![codecov](https://codecov.io/gh/AcalaNetwork/wormhole-relayer/branch/master/graph/badge.svg?token=dCTHZ0NE2X)](https://codecov.io/gh/AcalaNetwork/wormhole-relayer)

Relayer has two primary functionalities:
- pays the gas fee and redeems tokens on Karura/Acala after a user sends tokens through wormhole
- calls [asset router](https://github.com/AcalaNetwork/asset-router) contracts to route tokens to wormhole or through XCM

## Run Locally
- install deps: `yarn`
- build: `yarn build`
- start with dist code: `yarn start`
- start with dev server: `yarn dev`

## Run with Docker
docker-compose version: `docker-compose version 1.29.2, build 5becea4c`

- start dev server with docker: `docker-compose up`
- start dev server with docker in background: `docker compose up -d --build`

## Endpoints
### `/version`
get the relayer version
```
GET /version
1.4.0
```

### `/shouldRelay`
checks if the relayer can relay this request
```
GET /shouldRelay
params: {
  targetChain: ChainId,
  originAsset: string,    // original address without padding 0s
  amount: string,
}
```

example
```
# ---------- when should relay ---------- #
GET /shouldRelay?originAsset=0x337610d27c682e347c9cd60bd4b3b107c9d34ddd&amount=10000000000000000000&targetChain=11
=> {"data": { "shouldRelay":true,"msg":"" }}

# ---------- when should not relay ---------- #
GET /shouldRelay?targetChain=12&originAsset=J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn&amount=10000
=> {"data":{"shouldRelay":false,"msg":"transfer amount too small, expect at least 1000000"}}

GET /shouldRelay?targetChain=12&originAsset=0x00000000000000000111111111111&amount=10000
=> {"data":{"shouldRelay":false,"msg":"originAsset 0x00000000000000000111111111111 not supported"}}

GET shouldRelay?targetChain=3&originAsset=J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn&amount=10000000
=> {"data":{"shouldRelay":false,"msg":"target chain 3 is not supported"}}
```
### `/relay`
ask the relayer to relay a request, given the signedVAA
```
POST /relay
data: {
  targetChain: ChainId,
  signedVAA: string,      // hex encoded string
}
```

example
```
POST /relay
{
  targetChain: 11,
  signedVAA: 010000000001007b98257f6bf142c480a0b63ee571374fff5fe4dcd3127977af6860ce516b58084b137c40f913f8d7ca450d5413d619ba85104fbcb0a8a44e4db509faa4ef06d601622af226fd4d000000040000000000000000000000009dcf9d205c9de35334d646bee44b2d2859712a09000000000000011e0f0100000000000000000000000000000000000000000000000000000000000f4240000000000000000000000000337610d27c682e347c9cd60bd4b3b107c9d34ddd0004000000000000000000000000e3234f433914d4cfcf846491ec5a7831ab9f0bb3000b0000000000000000000000000000000000000000000000000000000000000000,
}

=> TX receipt
{
  data: {
    to: '0xd11De1f930eA1F7Dd0290Fe3a2e35b9C91AEFb37',
    from: '0xe3234f433914d4cfCF846491EC5a7831ab9f0bb3',
    contractAddress: '0xd11De1f930eA1F7Dd0290Fe3a2e35b9C91AEFb37',
    transactionIndex: 0,
    gasUsed: { type: 'BigNumber', hex: '0x00' },
    logsBloom: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    blockHash: '0x4fed14e47607e6088d1cb324ddc1bb14ea4c1f67507935b09cf093d11a9d3067',
    transactionHash: '0x1878aed11208b91aa83573f4b88333ca6a0fe96657860470e9bc6002b39e9e28',
    logs: [ [Object] ],
    blockNumber: 95578,
    confirmations: 1,
    cumulativeGasUsed: { type: 'BigNumber', hex: '0x00' },
    effectiveGasPrice: { type: 'BigNumber', hex: '0x01' },
    status: 1,
    type: 0,
    byzantium: true,
    events: [ [Object] ]
  }
}
```

### `/shouldRouteXcm`
checks if the relayer can relay and route this request, returns router address and it's chainId.
- when request success: return data can be found in `res.data`
- when request failed: error can be found in `res.error`
```
GET /shouldRouteXcm
params: {
  destParaId: string,     // destination parachain id in number
  dest: string,           // xcm encoded dest in hex
  originAddr: string,    // original token address in hex
}
```

example
```
# ---------- when should route ---------- #
GET /shouldRouteXcm?dest=0x03010200a9200100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d&destParaId=2090&originAddr=0x07865c6e87b9f70255377e024ace6630c1eaa37f
=>
{
  "data": {
    "shouldRoute": true,
    "routerAddr": "0x8341Cd8b7bd360461fe3ce01422fE3E24628262F",
    "routerChainId": 11,
  }
}

# ---------- when should not route ---------- #
GET /shouldRouteXcm?dest=0x03010200a9200100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d&destParaId=1111&originAddr=0x07865c6e87b9f70255377e024ace6630c1eaa37f
=>
{
  "data": {
    "shouldRoute":false,
    "msg":"unsupported dest parachain: 1111",
  }
}

GET /shouldRouteXcm?dest=0x03010200a9200100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d&destParaId=2090&originAddr=0x07865c6e87b9f70255377e024ace6630c1eaaaaa
=>
{
  "data": {
    "shouldRoute":false,
    "msg":"unsupported token on dest parachin 2090. Token origin address: 0x07865c6e87b9f70255377e024ace6630c1eaaaaa"
  }
}

# ---------- when error ---------- #
GET /shouldRouteXcm?dest=0x03010200a9200100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d&originAddr=0x07865c6e87b9f70255377e024ace6630c1eaa37f
=>
{
  "error":["destParaId is a required field"],
  "msg":"invalid request params!"
}
```

### `/routeXcm`
route this request, and returns the transaction hash
- when request success: transaction hash can be found in `res.data`
- when request failed: error can be found in `res.error`
```
POST /routeXcm
data: {
  destParaId: string,     // destination parachain id in number
  dest: string,           // xcm encoded dest in hex
  originAddr: string,    // original token address in hex
}
```

example
```
/* ---------- when success ---------- */
POST /routeXcm
{
  destParaId: "2090",
  dest: "0x03010200a9200100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d",
  originAddr: "0x07865c6e87b9f70255377e024ace6630c1eaa37f",
}

=> tx hash
{
  data: 0xb292b872fb7ddd33de25b0a7ee66e65bac918ec1ab0a6d93446f3dde7435955b
}

/* ---------- when error ---------- */
POST /routeXcm
{
  ...errorParams
}

=> error details
{
    "error": "VM Exception while processing transaction: execution revert: TRANSFER_FAILED 0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000f5452414e534645525f4641494c45440000000000000000000000000000000000",
    "msg": "internal server error: Error"
}
```

### `/relayAndRoute`
relay from wormhole, and route token to target chain, and returns transaction hashes
- when request success: return data can be found in `res.data`
- when request failed: error can be found in `res.error`

```
POST /relayAndRoute
data: {
  destParaId: string,     // destination parachain id in number
  dest: string,           // xcm encoded dest in hex
  originAddr: string,    // original token address in hex
  signedVAA: string,      // hex encoded string
}
```

example
```
POST /routeXcm
{
  destParaId: "2090",
  dest: "0x03010200a9200100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d",
  originAddr: "0x07865c6e87b9f70255377e024ace6630c1eaa37f",
  signedVAA: 010000000001007b98257f6bf142c480a0b63ee571374fff5fe4dcd3127977af6860ce516b58084b137c40f913f8d7ca450d5413d619ba85104fbcb0a8a44e4db509faa4ef06d601622af226fd4d000000040000000000000000000000009dcf9d205c9de35334d646bee44b2d2859712a09000000000000011e0f0100000000000000000000000000000000000000000000000000000000000f4240000000000000000000000000337610d27c682e347c9cd60bd4b3b107c9d34ddd0004000000000000000000000000e3234f433914d4cfcf846491ec5a7831ab9f0bb3000b0000000000000000000000000000000000000000000000000000000000000000
}

=> tx hashes
{
  data: [
    0xb292b872fb7ddd33de25b0a7ee66e65bac918ec1ab0a6d93446f3dde7435955b,   // relay
    0xd3b5cbdbc0b8026e7de085b80f0923cf0c92c96f788d702635383c26b8c070c9    // xcm
  ]
}

/* ---------- when error ---------- */
// similar to /routeXcm
```

### `/relayAndRouteBatch`
similar to `/relayAndRoute`, the only differences are:
- internally it sends a single substrate batch extrinsic, instead of sending relay and batch evm tx separately
- result is returned in a single tx hash

example
```
POST /routeXcm
{
  destParaId: "2090",
  dest: "0x03010200a9200100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d",
  originAddr: "0x07865c6e87b9f70255377e024ace6630c1eaa37f",
  signedVAA: 010000000001007b98257f6bf142c480a0b63ee571374fff5fe4dcd3127977af6860ce516b58084b137c40f913f8d7ca450d5413d619ba85104fbcb0a8a44e4db509faa4ef06d601622af226fd4d000000040000000000000000000000009dcf9d205c9de35334d646bee44b2d2859712a09000000000000011e0f0100000000000000000000000000000000000000000000000000000000000f4240000000000000000000000000337610d27c682e347c9cd60bd4b3b107c9d34ddd0004000000000000000000000000e3234f433914d4cfcf846491ec5a7831ab9f0bb3000b0000000000000000000000000000000000000000000000000000000000000000
}

=> tx hashes
{
  data: 0xb292b872fb7ddd33de25b0a7ee66e65bac918ec1ab0a6d93446f3dde7435955b    // single batch extrinsic tx hash
}
```

### `/shouldRouteWormhole`
checks if the relayer can relay and route this request, returns router address
```
GET /shouldRouteWormhole
params: {
  originAddr: string;     // original token address in hex
  targetChainId: string;  // dest wormhole chainId wormhole in number
  destAddr: string;       // recepient address in hex
  fromParaId: string;     // from parachain id in number
}
```

example
```
# ---------- when should route ---------- #
GET /shouldRouteWormhole?originAddr=0x07865c6e87b9f70255377e024ace6630c1eaa37f&targetChainId=2&destAddr=0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6&fromParaId=2090
=>
{
  "data": {
    "shouldRoute":true,
    "routerAddr":"0xC8a0596848966f61be4cd1875373d2728e162eE2",
  }
}

# ---------- when should not route ---------- #
GET /shouldRouteWormhole?originAddr=0x07865c6e87b9f70255377e024ace6630c1eaa37f&targetChainId=2&destAddr=0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6&fromParaId=2111
=>
{
  "data": {
    "shouldRoute":false,
    "msg":"unsupported origin parachain: 2111"
  }
}

GET /shouldRouteWormhole?originAddr=0x07865c6e87b9f70255377e024ace6630c1e00000&targetChainId=2&destAddr=0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6&fromParaId=2090
=>
{
  "data": {
    "shouldRoute":false,
    "msg":"origin token 0x07865c6e87b9f70255377e024ace6630c1e00000 not supported on router chain 11"
  }
}

# ---------- when error ---------- #
GET /shouldRouteWormhole?originAddr=0x07865c6e87b9f70255377e024ace6630c1e00000&targetChainId=2&destAddr=0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6
=>
{
  "error": ["fromParaId is a required field"],
  "msg": "invalid request params!"
}
```

### `/routeWormhole`
route the quest, and returns the wormhole deposit tx hash
```
POST /routeWormhole
data: {
  originAddr: string;     // original token address in hex
  targetChainId: string;  // dest wormhole chainId wormhole in number
  destAddr: string;       // recepient address in hex
  fromParaId: string;     // from parachain id in number
}
```

example
```
POST /routeWormhole
data: {
  originAddr: "0x07865c6e87b9f70255377e024ace6630c1eaa37f",
  targetChainId: "2",
  destAddr: "0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6",
  fromParaId: "2090"
}

=> tx hash
0x677cd79963bb4b45c50009f213194397be3081cfb206e958da02b6357c44674e

/* ---------- when error ---------- */
// similar to /routeXcm
```

### `/shouldRouteHoma`
checks if the relayer can route this request, returns router address
```
GET /shouldRouteHoma
params: {
  destAddr: string;   // recepient evm or acala native address
  chain: string;      // 'acala' or 'karura'
}
```

example
```
# ---------- when should route ---------- #
GET /shouldRouteHoma?destAddr=0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6&chain=acala
=>
{
  "data": {
    "shouldRoute": true,
    "routerAddr": "0xfD6143c380706912a04230f22cF92c402561820e"
  }
}

GET /shouldRouteHoma?destAddr=23AdbsfRysaabyrWS2doCFsKisvt7dGbS3wQFXRS6pNbQY8G&chain=acala
=>
{
  "data": {
    "shouldRoute": true,
    "routerAddr": "0xfD6143c380706912a04230f22cF92c402561820e"
  }
}

# ---------- when should not route ---------- #
GET /shouldRouteHoma?destAddr=0xabcde&chain=acala
=>
{
  "data": {
    "shouldRoute": false,
    "msg": "address 0xabcde is not a valid evm or substrate address"
  }
}

# ---------- when error ---------- #
GET /shouldRouteHoma?chain=acala
=>
{
  "msg": "invalid request params!",
  "error": [
    "destAddr is a required field"
  ]
}
```

### `/routeHoma`
route the quest, and returns the route txhash
```
POST /routeHoma
data: {
  destAddr: string;   // recepient evm or acala native address
  chain: string;      // 'acala' or 'karura'
}
```

example
```
POST /routeHoma
data: {
  destAddr: 0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6
  chain: 'acala'
}

=> tx hash
{
  data: '0x677cd79963bb4b45c50009f213194397be3081cfb206e958da02b6357c44674e'
}


/* ---------- when error ---------- */
// similar to /routeXcm
```

### `/routeHomaAuto`
wait for the token to arrive at the router, then route the quest automatically. Returns the request id, which can be used to track route progress
```
POST /routeHomaAuto
data: {
  destAddr: string;   // recepient evm or acala native address
  chain: string;      // 'acala' or 'karura'
}
```

example
```
POST /routeHomaAuto
data: {
  destAddr: 0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6
  chain: 'acala'
}

=> route id
{
  data: 'homa-1711514333845'
}

GET /routeStatus?routeId=homa-1711514333845
=> route status
[{ data: { status: 0 } }]                     // waiting for token
[{ data: { status: 1 } }]                     // token arrived, routing
[{ data: { status: 2, txHash: '0x12345' } }]   // routing tx submitted, waiting for confirmation
[{ data: { status: 3, txHash: '0x12345' } }]   // routing completed
[{ data: { status: -1 } }]                    // routing timeout out (usually becuase no token arrive in 3 min)
[{ data: { status: -2, error: 'xxx' } }]      // routing failed

GET /routeStatus?destAddr=0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6
=> all route status for this address
[
  { data: { status: 3, txHash: '0x11111' } },
  { data: { status: 2, txHash: '0x22222' } },
  { data: { status: 1 } },
]

/* ---------- when error ---------- */
// similar to /routeXcm
```

### `/shouldRouteEuphrates`
checks if the relayer can route this request, returns router address
```
GET /shouldRouteEuphrates
params: {
  recipient: string;   // recepient evm address
  poolId: string;      // euphrate pool id
}
```

example
```
GET /shouldRouteEuphrates?poolId=0&recipient=0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6
=>
{
  "data": {
    "shouldRoute": true,
    "routerAddr": "0xCc968605e16C9dF27b03aE3E5273507216Fd4C9C"
  }
}
```

### `/routeEuphrates`
route the quest, and returns the route txhash
```
POST /routeEuphrates
data: {
  recipient: string;   // recepient evm address
  poolId: string;      // euphrate pool id
  token: string;       // token address to route
}
```

example
```
POST /routeEuphrates
data: {
  recipient: "0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6",
  poolId:"0",
  token: "0x000000000000000000040000000000000000000d"
}

=> tx hash
{
  data: '0x677cd79963bb4b45c50009f213194397be3081cfb206e958da02b6357c44674e'
}


/* ---------- when error ---------- */
// similar to /routeXcm
```

### `/shouldSwapAndRoute`
checks if the relayer can route this request, returns router address
```
GET /shouldSwapAndRoute
params: {
  poolId: string;         // euphrates pool id
  recipient: string;      // dest evm address
}
```

example
```
GET /shouldSwapAndRoute?recipient=0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6&poolId=7
=>
{
  "data": {
    "shouldRoute": true,
    "routerAddr": "0xCc968605e16C9dF27b03aE3E5273507216Fd4C9C"
  }
}
```

### `/swapAndRoute`
swap small amount of token and airdrop ACA to recipient, and route the quest, then returns the txhash
```
POST /swapAndRoute
data: {
  poolId: string;         // euphrates pool id
  recipient: string;      // dest evm address
  token?: string;         // token to route, not required for `shouldRoute`
}
```

example
```
POST /swapAndRoute
data: {
  "poolId": 7,
  "recipient": "0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6",
  "token": "0xa7fb00459f5896c3bd4df97870b44e868ae663d7"
}

=> tx hash
{
  data: '0x677cd79963bb4b45c50009f213194397be3081cfb206e958da02b6357c44674e'
}


/* ---------- when error ---------- */
// similar to /routeXcm
```

### `/shouldRouteSwapAndLp`
checks if the relayer can route this request, returns router address
```
GET /shouldRouteSwapAndLp
params: {
  poolId: string;          // euphrates pool id
  recipient: string;       // dest evm address
  swapAmount: string;      // how many token to swap before adding liquidity
  minShareAmount?: string; // add liquidity min share amount (default: 0)
}
```

example
```
GET /shouldRouteSwapAndLp?recipient=0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6&swapAmount=100000000&poolId=7
=>
{
  "data": {
    "shouldRoute": true,
    "routerAddr": "0xC5a363695957469963c15Bf87B00B25eAbE8D234"
  }
}
```

### `/routeSwapAndLp`
- swap small amount of token and airdrop ACA to recipient
- swap `swapAmount` token to LDOT, then add LP, refund the remaining token recipient
- stake Lp to euphrates for the recipient
- returns the txhash
```
POST /routeSwapAndLp
data: {
  poolId: string;          // euphrates pool id
  recipient: string;       // dest evm address
  token: string;          // token to route
  swapAmount: string;      // how many token to swap before adding liquidity
  minShareAmount?: string; // add liquidity min share amount (default: 0)
}
```

example
```
POST /routeSwapAndLp
data: {
  "poolId": 7,
  "recipient": "0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6",
  "token": "0xa7fb00459f5896c3bd4df97870b44e868ae663d7",
  "swapAmount": 100000000
}

=> tx hash
{
  data: '0xe1c82c53796d82d87d2e31e289b3cc8ff18e304b8ac95f2bd7548a1706bb8655'
}

/* ---------- when error ---------- */
// similar to /routeXcm
```

### `/rescueSwapAndLp`
- perform gas drop
- rescue token to recipient

```
POST /rescueSwapAndLp
data: {
  poolId: string;          // euphrates pool id
  recipient: string;       // dest evm address
  token: string;          // token to route
  swapAmount: string;      // how many token to swap before adding liquidity
  minShareAmount?: string; // add liquidity min share amount (default: 0)
}
```

example
```
POST /rescueSwapAndLp
data: {
  "poolId": 7,
  "recipient": "0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6",
  "token": "0xa7fb00459f5896c3bd4df97870b44e868ae663d7",
  "swapAmount": 100000000
}

=> tx hash
{
  data: '0xe1c82c53796d82d87d2e31e289b3cc8ff18e304b8ac95f2bd7548a1706bb8655'
}

/* ---------- when error ---------- */
// similar to /routeXcm
```

## Routing Process
A complete working flow can be found in [routing e2e tests](./src/__tests__/route.test.ts).

### evm => parachain
1) call [/shouldRouteXcm](#shouldroutexcm) and get the router address on karura
2) bridge with wormhole from evm chain to karura router address
3) fetch VAA
4) call [/relayAndRoute](#relayandroute) with the VAA, this does two things:
   - relay (redeem) the token to karura router address
   - then perform routing, which xcm token to the target parachain

### parachain => evm
1) call [/shouldRouteWormhole](#shouldroutewormhole) and get the router address on karura
2) xcm from parachain to the router address to karura
3) call [/routewormhole](#routewormhole), this will send the tokens to wormhole from router address
4) fetch VAA and redeem on the target evm chain

## Tests
### test setup
use the test env file
```
mv .env.test .env
```

start a local test stack
```
yarn start:test-stack
```

### run tests with coverage report
- run tests and generate coverage data
```
yarn test:coverage
```

show coverage report in GUI
```
yarn vite preview --outDir ./coverage/
```

### run tests with separate relayer (no coverage report)
first start a local relayer
```
yarn dev
```

run tests
```
yarn test
```

## Production Config
`cp .env.example .env` and replace the test keys with real private keys for relayers
