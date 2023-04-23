import { App } from "./app";
import Web3Helper, { ICryptoWindow } from "./web3-helper";
import { BatchRequest } from "./batch-request";
const TokenAbi = require("./token.abi.json");

const TokenInfo = {
  networks: {
    59140: {
      address: "0x647f45605b9EaE4DD8A452dC765fDB6B63EB218F", // Mock USDC with gas funding
    },
  },
  abi: TokenAbi,
};
// TODO: replace token manager API
const tokenManagerUrl = "https://tokenmanager.example.com/json-rpc";

const supportedChainIds = new Set([59140]);

const storageKeyForPrivateKey = "__PRIVATE_KEY_FOR_WEB_WALLET__";
const rpcUrl = "https://rpc.goerli.linea.build";

export class AppHelper {
  chainId: number;
  _window: ICryptoWindow;
  constructor(window: ICryptoWindow) {
    this._window = window;
  }

  async getApp(): Promise<App> {
    const web3Helper = new Web3Helper(
      this._window,
      this._window.localStorage,
      this._window["Web3"]
    );
    const web3 = await web3Helper.getWeb3({
      lightWalletStorageKeyForPrivateKey: storageKeyForPrivateKey,
      lightWalletRpcUrl: rpcUrl,
    });
    const b = new BatchRequest(web3);
    b.add((web3.eth.getAccounts as any).request());
    b.add((web3.eth.net.getId as any).request());
    const [accounts, chainId] = await b.execute();
    this.chainId = chainId;
    if (!supportedChainIds.has(chainId)) {
      throw new Error(`unsupported chain: "${chainId}"`);
    }
    const fromAddress = accounts[0];
    const token = new web3.eth.Contract(
      TokenInfo.abi,
      TokenInfo.networks[chainId].address,
      {
        from: fromAddress,
      }
    ) as any;
    token.transactionConfirmationBlocks = 1;
    window["token"] = token;
    return new App(
      storageKeyForPrivateKey,
      web3,
      chainId,
      fromAddress,
      token,
      tokenManagerUrl
    );
  }

  currentChainIsSupported(): boolean {
    return supportedChainIds.has(this.chainId);
  }
}
