// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers as hhEthers } from 'hardhat'
import { Signer } from 'ethers'
import ethers from 'ethers'
import { MockERC20__factory } from '../typechain-types'

const toChecksumAddress = hhEthers.utils.getAddress

const getEnvAllowEmpty = (keyDescription: string, key: string): string => {
  if (!key) {
    throw Error(`getEnvAllowEmpty("${key}"): "${keyDescription}": env var key is empty`)
  }
  const v = process.env[key]
  if (v === undefined) {
    throw Error(`getEnvAllowEmpty("$${key}"): "${keyDescription}": env var not set`)
  }
  return v
}
const getEnv = (keyDescription: string, key: string): string => {
  const v = getEnvAllowEmpty(keyDescription, key)
  if (v === '') {
    throw Error(`getEnv("$${key}"): "${keyDescription}": env var set to empty string`)
  }
  return v
}

const signerFromEnvVar = (envVar: string, provider: any): Signer => {
  const sk = getEnv(envVar, envVar)
  return new hhEthers.Wallet(sk, provider)
}

const isTestNet = (chainId: number) => {
  // development env: hardhat, ganache, foundry etc
  if (chainId === 31337 || chainId === 1337) {
    return true
  }
  // Kovan testnet
  if (chainId === 42) {
    return true
  }
  return false
}

async function main() {
  console.log('Minting mock USDC token on testnet')

  const deployerSigner = signerFromEnvVar('PRIVATE_KEY', hhEthers.provider)
  const deployer = toChecksumAddress(await deployerSigner.getAddress())
  const chainId = await deployerSigner.getChainId()
  const nonce = await deployerSigner.getTransactionCount()

  console.log('mint: deployer.address:', deployer)
  console.log('deployer.nonce:', nonce)

  console.log('mint: chainId:', chainId)
  const tokenAddr = getEnv('TOKEN_ADDR', 'TOKEN_ADDR')
  const walletAddr = getEnv('WALLET_ADDR', 'WALLET_ADDR')
  const token = MockERC20__factory.connect(tokenAddr, deployerSigner)
  let tx = await token.mint(walletAddr, hhEthers.utils.parseUnits('1000000', 6))
  let receipt = await tx.wait()
  console.log('Mined in block:', receipt.blockNumber, 'receipt.status:', receipt.status, ', gasUsed:', receipt.gasUsed)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exit(1)
})
