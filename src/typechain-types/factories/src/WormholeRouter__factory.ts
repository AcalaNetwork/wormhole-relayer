/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../common";
import type {
  WormholeRouter,
  WormholeRouterInterface,
  WormholeInstructionsStruct,
} from "../../src/WormholeRouter";

const _abi = [
  {
    inputs: [
      {
        internalType: "contract FeeRegistry",
        name: "fees",
        type: "address",
      },
      {
        components: [
          {
            internalType: "uint16",
            name: "recipientChain",
            type: "uint16",
          },
          {
            internalType: "bytes32",
            name: "recipient",
            type: "bytes32",
          },
          {
            internalType: "uint32",
            name: "nonce",
            type: "uint32",
          },
          {
            internalType: "uint256",
            name: "arbiterFee",
            type: "uint256",
          },
        ],
        internalType: "struct WormholeInstructions",
        name: "instructions",
        type: "tuple",
      },
      {
        internalType: "address",
        name: "tokenBridgeAddress",
        type: "address",
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
        name: "addr",
        type: "address",
      },
    ],
    name: "RouterCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "addr",
        type: "address",
      },
    ],
    name: "RouterDestroyed",
    type: "event",
  },
  {
    inputs: [],
    name: "fees",
    outputs: [
      {
        internalType: "contract FeeRegistry",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ERC20",
        name: "token",
        type: "address",
      },
      {
        internalType: "address",
        name: "relayer",
        type: "address",
      },
    ],
    name: "route",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract ERC20",
        name: "token",
        type: "address",
      },
    ],
    name: "routeNoFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const _bytecode =
  "0x60806040523480156200001157600080fd5b5060405162000f2c38038062000f2c833981810160405281019062000037919062000479565b82806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055503073ffffffffffffffffffffffffffffffffffffffff167f59490ddc6330cd50a9703c0b77827ff51b21e7a8592eb50d5252a4d20188cfd360405160405180910390a25081600360008201518160000160006101000a81548161ffff021916908361ffff1602179055506020820151816001015560408201518160020160006101000a81548163ffffffff021916908363ffffffff1602179055506060820151816003015590505080600260006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555080600160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550505050620004d5565b6000604051905090565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000620001e782620001ba565b9050919050565b6000620001fb82620001da565b9050919050565b6200020d81620001ee565b81146200021957600080fd5b50565b6000815190506200022d8162000202565b92915050565b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b620002838262000238565b810181811067ffffffffffffffff82111715620002a557620002a462000249565b5b80604052505050565b6000620002ba620001ab565b9050620002c8828262000278565b919050565b600061ffff82169050919050565b620002e681620002cd565b8114620002f257600080fd5b50565b6000815190506200030681620002db565b92915050565b6000819050919050565b62000321816200030c565b81146200032d57600080fd5b50565b600081519050620003418162000316565b92915050565b600063ffffffff82169050919050565b620003628162000347565b81146200036e57600080fd5b50565b600081519050620003828162000357565b92915050565b6000819050919050565b6200039d8162000388565b8114620003a957600080fd5b50565b600081519050620003bd8162000392565b92915050565b600060808284031215620003dc57620003db62000233565b5b620003e86080620002ae565b90506000620003fa84828501620002f5565b6000830152506020620004108482850162000330565b6020830152506040620004268482850162000371565b60408301525060606200043c84828501620003ac565b60608301525092915050565b6200045381620001da565b81146200045f57600080fd5b50565b600081519050620004738162000448565b92915050565b600080600060c08486031215620004955762000494620001b5565b5b6000620004a5868287016200021c565b9350506020620004b886828701620003c3565b92505060a0620004cb8682870162000462565b9150509250925092565b610a4780620004e56000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c806338bb09c9146100465780639af1d35a14610062578063c0f36cb014610080575b600080fd5b610060600480360381019061005b91906105c8565b61009c565b005b61006a61010c565b6040516100779190610654565b60405180910390f35b61009a6004803603810190610095919061069b565b610130565b005b6100a58161024b565b60004703610109573073ffffffffffffffffffffffffffffffffffffffff167f4d71224652a46a6b2a06bc43b09b55d157972d227c848693032b32aa7d5aefe860405160405180910390a23373ffffffffffffffffffffffffffffffffffffffff16ff5b50565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663b88c9148846040518263ffffffff1660e01b815260040161018c91906106ea565b602060405180830381865afa1580156101a9573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906101cd919061073b565b905060008111610212576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610209906107c5565b60405180910390fd5b61023d82828573ffffffffffffffffffffffffffffffffffffffff166104bb9092919063ffffffff16565b6102468361009c565b505050565b8073ffffffffffffffffffffffffffffffffffffffff1663095ea7b3600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff166370a08231306040518263ffffffff1660e01b81526004016102c391906106ea565b602060405180830381865afa1580156102e0573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610304919061073b565b6040518363ffffffff1660e01b81526004016103219291906107f4565b6020604051808303816000875af1158015610340573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906103649190610855565b50600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16630f5287b0828373ffffffffffffffffffffffffffffffffffffffff166370a08231306040518263ffffffff1660e01b81526004016103dd91906106ea565b602060405180830381865afa1580156103fa573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061041e919061073b565b600360000160009054906101000a900461ffff166003600101546003800154600360020160009054906101000a900463ffffffff166040518763ffffffff1660e01b8152600401610474969594939291906108d7565b6020604051808303816000875af1158015610493573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906104b79190610978565b5050565b60006040517fa9059cbb000000000000000000000000000000000000000000000000000000008152836004820152826024820152602060006044836000895af13d15601f3d116001600051141617169150508061054d576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610544906109f1565b60405180910390fd5b50505050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061058382610558565b9050919050565b600061059582610578565b9050919050565b6105a58161058a565b81146105b057600080fd5b50565b6000813590506105c28161059c565b92915050565b6000602082840312156105de576105dd610553565b5b60006105ec848285016105b3565b91505092915050565b6000819050919050565b600061061a61061561061084610558565b6105f5565b610558565b9050919050565b600061062c826105ff565b9050919050565b600061063e82610621565b9050919050565b61064e81610633565b82525050565b60006020820190506106696000830184610645565b92915050565b61067881610578565b811461068357600080fd5b50565b6000813590506106958161066f565b92915050565b600080604083850312156106b2576106b1610553565b5b60006106c0858286016105b3565b92505060206106d185828601610686565b9150509250929050565b6106e481610578565b82525050565b60006020820190506106ff60008301846106db565b92915050565b6000819050919050565b61071881610705565b811461072357600080fd5b50565b6000815190506107358161070f565b92915050565b60006020828403121561075157610750610553565b5b600061075f84828501610726565b91505092915050565b600082825260208201905092915050565b7f7a65726f20666565000000000000000000000000000000000000000000000000600082015250565b60006107af600883610768565b91506107ba82610779565b602082019050919050565b600060208201905081810360008301526107de816107a2565b9050919050565b6107ee81610705565b82525050565b600060408201905061080960008301856106db565b61081660208301846107e5565b9392505050565b60008115159050919050565b6108328161081d565b811461083d57600080fd5b50565b60008151905061084f81610829565b92915050565b60006020828403121561086b5761086a610553565b5b600061087984828501610840565b91505092915050565b600061ffff82169050919050565b61089981610882565b82525050565b6000819050919050565b6108b28161089f565b82525050565b600063ffffffff82169050919050565b6108d1816108b8565b82525050565b600060c0820190506108ec60008301896106db565b6108f960208301886107e5565b6109066040830187610890565b61091360608301866108a9565b61092060808301856107e5565b61092d60a08301846108c8565b979650505050505050565b600067ffffffffffffffff82169050919050565b61095581610938565b811461096057600080fd5b50565b6000815190506109728161094c565b92915050565b60006020828403121561098e5761098d610553565b5b600061099c84828501610963565b91505092915050565b7f5452414e534645525f4641494c45440000000000000000000000000000000000600082015250565b60006109db600f83610768565b91506109e6826109a5565b602082019050919050565b60006020820190508181036000830152610a0a816109ce565b905091905056fea2646970667358221220daec36935eefed74f87cde0fea2a0537aca4d6c0a4a79d128a74ccf6ab49c13d64736f6c63430008120033";

type WormholeRouterConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: WormholeRouterConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class WormholeRouter__factory extends ContractFactory {
  constructor(...args: WormholeRouterConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    fees: PromiseOrValue<string>,
    instructions: WormholeInstructionsStruct,
    tokenBridgeAddress: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<WormholeRouter> {
    return super.deploy(
      fees,
      instructions,
      tokenBridgeAddress,
      overrides || {}
    ) as Promise<WormholeRouter>;
  }
  override getDeployTransaction(
    fees: PromiseOrValue<string>,
    instructions: WormholeInstructionsStruct,
    tokenBridgeAddress: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(
      fees,
      instructions,
      tokenBridgeAddress,
      overrides || {}
    );
  }
  override attach(address: string): WormholeRouter {
    return super.attach(address) as WormholeRouter;
  }
  override connect(signer: Signer): WormholeRouter__factory {
    return super.connect(signer) as WormholeRouter__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): WormholeRouterInterface {
    return new utils.Interface(_abi) as WormholeRouterInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): WormholeRouter {
    return new Contract(address, _abi, signerOrProvider) as WormholeRouter;
  }
}
