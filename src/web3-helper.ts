import Web3 from 'web3'
import {LightWalletProvider} from './lightwallet-provider'

/* arrayEquals only works on arrays of types that can be compared with '===' */
function arrayEquals(a: string[], b: string[]) {
  if (a.length != b.length) {
    return false
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}

// User visiting DApp using normal Browser
const errRefusedToUnlockWallet = new Error('user refused to unlock wallet')

interface IStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface ICryptoWindow extends Window {
  ethereum: any
  web3: Web3
  Trust: any
  AbortController: any
  fetch: any
  WebSocket: any
}

class Web3Helper {
  _accounts: string[] = []
  _networkId: number = -1
  _web3: Web3
  _storage: IStorage
  _window: ICryptoWindow
  web3Ctor: any

  constructor(_window: ICryptoWindow, storage: IStorage, web3Ctor: any) {
    const self = this
    this._storage = storage
    this._window = _window
    this.web3Ctor = web3Ctor
    if (_window.ethereum) {
      // TrustWallet could inject a `window.ethereum` obj without an `on` method
      if (_window.ethereum.on) {
        _window.ethereum.on('accountsChanged', function (accounts: string[]) {
          console.log('ethereum.accountsChanged event, accounts:', accounts)
          if (self._accounts !== null && !arrayEquals(accounts, self._accounts)) {
            window.location.reload()
          }
        })
      }
    }
  }
  async getAccounts() {
    if (this._accounts.length === 0) {
      this._accounts = await this._web3.eth.getAccounts()
    }
    return this._accounts
  }
  async getNetworkId() {
    if (this._networkId === -1) {
      this._networkId = await this._web3.eth.net.getId()
    }
    return this._networkId
  }
  getPrivateKeyFromStorage(k: string): string {
    let sk = this._storage.getItem(k);
    if (sk !== null) {
      return sk;
    }
    const w3 = new this.web3Ctor();
    sk = w3.eth.accounts.create().privateKey;
    this._storage.setItem(k, sk);
    return sk;
  }
  async getWeb3(options: any) {
    let provider
    if (this._window.Trust) {
      const trust = this._window.web3.currentProvider as any
      this._accounts = await trust.enable()
      if (this._accounts === undefined) {
        throw errRefusedToUnlockWallet
      }
      this._networkId = parseInt(trust.net_version())
      trust.send = trust.sendAsync
      provider = trust
    } else if (this._window.ethereum) {
      this._accounts = await this._window.ethereum.enable()
      if (this._accounts === undefined) {
        throw errRefusedToUnlockWallet
      }
      const n = this._window.ethereum.networkVersion
      if (n !== 'loading') {
        // MetaMask is connecting to the RPC-endpoint
        this._networkId = parseInt(n)
      }
      provider = this._window.ethereum
    } else if (this._window.web3) {
      provider = this._window.web3.currentProvider
    } else {
      const privateKeys: string[] = [this.getPrivateKeyFromStorage(options.lightWalletStorageKeyForPrivateKey)]
      const w = this._window;
      provider = new LightWalletProvider(
        w.fetch,
        w.AbortController,
        w.WebSocket,
        (new this.web3Ctor()).eth.accounts,
        {},
        privateKeys,
        options.lightWalletRpcUrl,
        0,
        privateKeys.length,
      )
    }
    this._web3 = new this.web3Ctor(provider)
    return this._web3
  }
  errIsUserRejectingTransaction(err: Error) {
    if (err.message === 'Returned error: Error: MetaMask Tx Signature: User denied transaction signature.') {
      // MetaMask
      return true
    } else if (err.message === 'cancelled') {
      // TrustWallet
      return true
    } else if (Object.is(err, errRefusedToUnlockWallet)) {
      return true
    }
    return false
  }
}

export default Web3Helper
