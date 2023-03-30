/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../common";
import type { MockToken, MockTokenInterface } from "../../src/MockToken";

const _abi = [
  {
    inputs: [
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "string",
        name: "symbol",
        type: "string",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [],
    name: "DOMAIN_SEPARATOR",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "forceTransfer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "nonces",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
      {
        internalType: "uint8",
        name: "v",
        type: "uint8",
      },
      {
        internalType: "bytes32",
        name: "r",
        type: "bytes32",
      },
      {
        internalType: "bytes32",
        name: "s",
        type: "bytes32",
      },
    ],
    name: "permit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const _bytecode =
  "0x60e06040523480156200001157600080fd5b506040516200207c3803806200207c8339818101604052810190620000379190620003aa565b8181601282600090816200004c91906200067a565b5081600190816200005e91906200067a565b508060ff1660808160ff16815250504660a0818152505062000085620000b360201b60201c565b60c08181525050505050620000ab3369021e19e0c9bab24000006200014360201b60201c565b50506200097e565b60007f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f6000604051620000e7919062000810565b60405180910390207fc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc64630604051602001620001289594939291906200089a565b60405160208183030381529060405280519060200120905090565b806002600082825462000157919062000926565b9250508190555080600360008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825401925050819055508173ffffffffffffffffffffffffffffffffffffffff16600073ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040516200020b919062000961565b60405180910390a35050565b6000604051905090565b600080fd5b600080fd5b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b620002808262000235565b810181811067ffffffffffffffff82111715620002a257620002a162000246565b5b80604052505050565b6000620002b762000217565b9050620002c5828262000275565b919050565b600067ffffffffffffffff821115620002e857620002e762000246565b5b620002f38262000235565b9050602081019050919050565b60005b838110156200032057808201518184015260208101905062000303565b60008484015250505050565b6000620003436200033d84620002ca565b620002ab565b90508281526020810184848401111562000362576200036162000230565b5b6200036f84828562000300565b509392505050565b600082601f8301126200038f576200038e6200022b565b5b8151620003a18482602086016200032c565b91505092915050565b60008060408385031215620003c457620003c362000221565b5b600083015167ffffffffffffffff811115620003e557620003e462000226565b5b620003f38582860162000377565b925050602083015167ffffffffffffffff81111562000417576200041662000226565b5b620004258582860162000377565b9150509250929050565b600081519050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b600060028204905060018216806200048257607f821691505b6020821081036200049857620004976200043a565b5b50919050565b60008190508160005260206000209050919050565b60006020601f8301049050919050565b600082821b905092915050565b600060088302620005027fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82620004c3565b6200050e8683620004c3565b95508019841693508086168417925050509392505050565b6000819050919050565b6000819050919050565b60006200055b620005556200054f8462000526565b62000530565b62000526565b9050919050565b6000819050919050565b62000577836200053a565b6200058f620005868262000562565b848454620004d0565b825550505050565b600090565b620005a662000597565b620005b38184846200056c565b505050565b5b81811015620005db57620005cf6000826200059c565b600181019050620005b9565b5050565b601f8211156200062a57620005f4816200049e565b620005ff84620004b3565b810160208510156200060f578190505b620006276200061e85620004b3565b830182620005b8565b50505b505050565b600082821c905092915050565b60006200064f600019846008026200062f565b1980831691505092915050565b60006200066a83836200063c565b9150826002028217905092915050565b62000685826200042f565b67ffffffffffffffff811115620006a157620006a062000246565b5b620006ad825462000469565b620006ba828285620005df565b600060209050601f831160018114620006f25760008415620006dd578287015190505b620006e985826200065c565b86555062000759565b601f19841662000702866200049e565b60005b828110156200072c5784890151825560018201915060208501945060208101905062000705565b868310156200074c578489015162000748601f8916826200063c565b8355505b6001600288020188555050505b505050505050565b600081905092915050565b60008190508160005260206000209050919050565b60008154620007908162000469565b6200079c818662000761565b94506001821660008114620007ba5760018114620007d05762000807565b60ff198316865281151582028601935062000807565b620007db856200076c565b60005b83811015620007ff57815481890152600182019150602081019050620007de565b838801955050505b50505092915050565b60006200081e828462000781565b915081905092915050565b6000819050919050565b6200083e8162000829565b82525050565b6200084f8162000526565b82525050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000620008828262000855565b9050919050565b620008948162000875565b82525050565b600060a082019050620008b1600083018862000833565b620008c0602083018762000833565b620008cf604083018662000833565b620008de606083018562000844565b620008ed608083018462000889565b9695505050505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000620009338262000526565b9150620009408362000526565b92508282019050808211156200095b576200095a620008f7565b5b92915050565b600060208201905062000978600083018462000844565b92915050565b60805160a05160c0516116ce620009ae6000396000610707015260006106d30152600061069401526116ce6000f3fe608060405234801561001057600080fd5b50600436106100cf5760003560e01c80633644e5151161008c57806395d89b411161006657806395d89b4114610228578063a9059cbb14610246578063d505accf14610276578063dd62ed3e14610292576100cf565b80633644e515146101aa57806370a08231146101c85780637ecebe00146101f8576100cf565b806306fdde03146100d4578063095ea7b3146100f257806318160ddd1461012257806323b872dd14610140578063313ce5671461017057806333bebb771461018e575b600080fd5b6100dc6102c2565b6040516100e99190610ed8565b60405180910390f35b61010c60048036038101906101079190610f93565b610350565b6040516101199190610fee565b60405180910390f35b61012a610442565b6040516101379190611018565b60405180910390f35b61015a60048036038101906101559190611033565b610448565b6040516101679190610fee565b60405180910390f35b610178610692565b60405161018591906110a2565b60405180910390f35b6101a860048036038101906101a39190611033565b6106b6565b005b6101b26106cf565b6040516101bf91906110d6565b60405180910390f35b6101e260048036038101906101dd91906110f1565b61072c565b6040516101ef9190611018565b60405180910390f35b610212600480360381019061020d91906110f1565b610744565b60405161021f9190611018565b60405180910390f35b61023061075c565b60405161023d9190610ed8565b60405180910390f35b610260600480360381019061025b9190610f93565b6107ea565b60405161026d9190610fee565b60405180910390f35b610290600480360381019061028b9190611176565b6108fe565b005b6102ac60048036038101906102a79190611218565b610bf7565b6040516102b99190611018565b60405180910390f35b600080546102cf90611287565b80601f01602080910402602001604051908101604052809291908181526020018280546102fb90611287565b80156103485780601f1061031d57610100808354040283529160200191610348565b820191906000526020600020905b81548152906001019060200180831161032b57829003601f168201915b505050505081565b600081600460003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040516104309190611018565b60405180910390a36001905092915050565b60025481565b600080600460008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205490507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff811461057e5782816104fd91906112e7565b600460008773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055505b82600360008773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546105cd91906112e7565b9250508190555082600360008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825401925050819055508373ffffffffffffffffffffffffffffffffffffffff168573ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8560405161067e9190611018565b60405180910390a360019150509392505050565b7f000000000000000000000000000000000000000000000000000000000000000081565b6106c08382610c1c565b6106ca8282610cec565b505050565b60007f0000000000000000000000000000000000000000000000000000000000000000461461070557610700610dbc565b610727565b7f00000000000000000000000000000000000000000000000000000000000000005b905090565b60036020528060005260406000206000915090505481565b60056020528060005260406000206000915090505481565b6001805461076990611287565b80601f016020809104026020016040519081016040528092919081815260200182805461079590611287565b80156107e25780601f106107b7576101008083540402835291602001916107e2565b820191906000526020600020905b8154815290600101906020018083116107c557829003601f168201915b505050505081565b600081600360003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825461083b91906112e7565b9250508190555081600360008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825401925050819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040516108ec9190611018565b60405180910390a36001905092915050565b42841015610941576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161093890611367565b60405180910390fd5b6000600161094d6106cf565b7f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c98a8a8a600560008f73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000206000815480929190600101919050558b6040516020016109d596959493929190611396565b604051602081830303815290604052805190602001206040516020016109fc92919061146f565b6040516020818303038152906040528051906020012085858560405160008152602001604052604051610a3294939291906114a6565b6020604051602081039080840390855afa158015610a54573d6000803e3d6000fd5b505050602060405103519050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614158015610ac857508773ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff16145b610b07576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610afe90611537565b60405180910390fd5b85600460008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008973ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002081905550508573ffffffffffffffffffffffffffffffffffffffff168773ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92587604051610be69190611018565b60405180910390a350505050505050565b6004602052816000526040600020602052806000526040600020600091509150505481565b80600360008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000206000828254610c6b91906112e7565b9250508190555080600260008282540392505081905550600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef83604051610ce09190611018565b60405180910390a35050565b8060026000828254610cfe9190611557565b9250508190555080600360008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825401925050819055508173ffffffffffffffffffffffffffffffffffffffff16600073ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef83604051610db09190611018565b60405180910390a35050565b60007f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f6000604051610dee919061162e565b60405180910390207fc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc64630604051602001610e2d959493929190611645565b60405160208183030381529060405280519060200120905090565b600081519050919050565b600082825260208201905092915050565b60005b83811015610e82578082015181840152602081019050610e67565b60008484015250505050565b6000601f19601f8301169050919050565b6000610eaa82610e48565b610eb48185610e53565b9350610ec4818560208601610e64565b610ecd81610e8e565b840191505092915050565b60006020820190508181036000830152610ef28184610e9f565b905092915050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610f2a82610eff565b9050919050565b610f3a81610f1f565b8114610f4557600080fd5b50565b600081359050610f5781610f31565b92915050565b6000819050919050565b610f7081610f5d565b8114610f7b57600080fd5b50565b600081359050610f8d81610f67565b92915050565b60008060408385031215610faa57610fa9610efa565b5b6000610fb885828601610f48565b9250506020610fc985828601610f7e565b9150509250929050565b60008115159050919050565b610fe881610fd3565b82525050565b60006020820190506110036000830184610fdf565b92915050565b61101281610f5d565b82525050565b600060208201905061102d6000830184611009565b92915050565b60008060006060848603121561104c5761104b610efa565b5b600061105a86828701610f48565b935050602061106b86828701610f48565b925050604061107c86828701610f7e565b9150509250925092565b600060ff82169050919050565b61109c81611086565b82525050565b60006020820190506110b76000830184611093565b92915050565b6000819050919050565b6110d0816110bd565b82525050565b60006020820190506110eb60008301846110c7565b92915050565b60006020828403121561110757611106610efa565b5b600061111584828501610f48565b91505092915050565b61112781611086565b811461113257600080fd5b50565b6000813590506111448161111e565b92915050565b611153816110bd565b811461115e57600080fd5b50565b6000813590506111708161114a565b92915050565b600080600080600080600060e0888a03121561119557611194610efa565b5b60006111a38a828b01610f48565b97505060206111b48a828b01610f48565b96505060406111c58a828b01610f7e565b95505060606111d68a828b01610f7e565b94505060806111e78a828b01611135565b93505060a06111f88a828b01611161565b92505060c06112098a828b01611161565b91505092959891949750929550565b6000806040838503121561122f5761122e610efa565b5b600061123d85828601610f48565b925050602061124e85828601610f48565b9150509250929050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061129f57607f821691505b6020821081036112b2576112b1611258565b5b50919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b60006112f282610f5d565b91506112fd83610f5d565b9250828203905081811115611315576113146112b8565b5b92915050565b7f5045524d49545f444541444c494e455f45585049524544000000000000000000600082015250565b6000611351601783610e53565b915061135c8261131b565b602082019050919050565b6000602082019050818103600083015261138081611344565b9050919050565b61139081610f1f565b82525050565b600060c0820190506113ab60008301896110c7565b6113b86020830188611387565b6113c56040830187611387565b6113d26060830186611009565b6113df6080830185611009565b6113ec60a0830184611009565b979650505050505050565b600081905092915050565b7f1901000000000000000000000000000000000000000000000000000000000000600082015250565b60006114386002836113f7565b915061144382611402565b600282019050919050565b6000819050919050565b611469611464826110bd565b61144e565b82525050565b600061147a8261142b565b91506114868285611458565b6020820191506114968284611458565b6020820191508190509392505050565b60006080820190506114bb60008301876110c7565b6114c86020830186611093565b6114d560408301856110c7565b6114e260608301846110c7565b95945050505050565b7f494e56414c49445f5349474e4552000000000000000000000000000000000000600082015250565b6000611521600e83610e53565b915061152c826114eb565b602082019050919050565b6000602082019050818103600083015261155081611514565b9050919050565b600061156282610f5d565b915061156d83610f5d565b9250828201905080821115611585576115846112b8565b5b92915050565b600081905092915050565b60008190508160005260206000209050919050565b600081546115b881611287565b6115c2818661158b565b945060018216600081146115dd57600181146115f257611625565b60ff1983168652811515820286019350611625565b6115fb85611596565b60005b8381101561161d578154818901526001820191506020810190506115fe565b838801955050505b50505092915050565b600061163a82846115ab565b915081905092915050565b600060a08201905061165a60008301886110c7565b61166760208301876110c7565b61167460408301866110c7565b6116816060830185611009565b61168e6080830184611387565b969550505050505056fea2646970667358221220a8945073d09f248d16fa4ad3712e794efce181f52a9dfaaae068ecd33edee45c64736f6c63430008120033";

type MockTokenConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: MockTokenConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class MockToken__factory extends ContractFactory {
  constructor(...args: MockTokenConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    name: PromiseOrValue<string>,
    symbol: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<MockToken> {
    return super.deploy(name, symbol, overrides || {}) as Promise<MockToken>;
  }
  override getDeployTransaction(
    name: PromiseOrValue<string>,
    symbol: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(name, symbol, overrides || {});
  }
  override attach(address: string): MockToken {
    return super.attach(address) as MockToken;
  }
  override connect(signer: Signer): MockToken__factory {
    return super.connect(signer) as MockToken__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): MockTokenInterface {
    return new utils.Interface(_abi) as MockTokenInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): MockToken {
    return new Contract(address, _abi, signerOrProvider) as MockToken;
  }
}
