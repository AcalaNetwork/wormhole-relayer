# Acala Wormhole Relayer
The relayer to pay gas fee and redeem token on Karura/Acala after user send token with wormhole.

## Run Locally
- install deps: `yarn`
- start: `yarn start`
- start dev server: `yarn dev`
- test: `yarn test`

## Run with Docker
docker-compose version: `docker-compose version 1.29.2, build 5becea4c`

- start dev server with docker: `docker-compose up`
- start dev server with docker in background: `docker-compose up -d --build`

## Endpoints
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
=> {"shouldRelay":true,"msg":""}

# ---------- when should not relay ---------- #
GET /shouldRelay?originAsset=0x337610d27c682e347c9cd60bd4b3b107c9d34ddd&amount=100000&targetChain=11
=> {"shouldRelay":false,"msg":"transfer amount too small, expect at least 10000000000000000"}

GET /shouldRelay?originAsset=0x00000000000000000111111111111&amount=10000000000000000000&targetChain=11
=> {"shouldRelay":false,"msg":"token not supported"}

GET /shouldRelay?originAsset=0x337610d27c682e347c9cd60bd4b3b107c9d34ddd&amount=100000&targetChain=11
=> {"shouldRelay":false,"msg":"target chain not supported"}
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
```
