// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, upgrades } from 'hardhat'
import { Signer } from 'ethers'

const toChecksumAddress = ethers.utils.getAddress

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
  return new ethers.Wallet(sk, provider)
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
	console.log('Deploying mock USDC token on testnet')

  const deployerSigner = signerFromEnvVar('PRIVATE_KEY', ethers.provider)
  const deployer = toChecksumAddress(await deployerSigner.getAddress())
  const chainId = await deployerSigner.getChainId()
  const nonce = await deployerSigner.getTransactionCount()

  console.log('deploy: deployer.address:', deployer)
  console.log('deployer.nonce:', nonce)
  console.log('deploy: chainId:', chainId)

  let contractAddr = '0x647f45605b9EaE4DD8A452dC765fDB6B63EB218F'
  if (true) {
  const ContractFactory = await ethers.getContractFactory('MockERC20')
  const contract = await ContractFactory.connect(deployerSigner).deploy('USD Coin', 'USDC', 6)
  console.log('Contract deployed to:', contract.address)
  contractAddr = contract.address
  }
  
  let tx = await deployerSigner.sendTransaction({value: ethers.utils.parseEther('0.01'), to: contractAddr})
  let receipt = await tx.wait()
  console.log('Funded contract in block:', receipt.blockNumber, ', receipt.status:', receipt.status, ', gasUsed:', receipt.gasUsed)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
