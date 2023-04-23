import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { GreeterUpgradeable } from '../typechain'
import { Signer } from 'ethers'

const toChecksumAddress = ethers.utils.getAddress
const zeroAddr = ethers.constants.AddressZero

describe('Greeter', function () {
  let deployer: string
  let deployerSigner: Signer

  before(async function () {
    ;[deployerSigner] = await ethers.getSigners()
    ;[deployer] = await ethers
      .getSigners()
      .then((signers) => signers.map((s) => toChecksumAddress(s.address)))
  })

  it('Upgrades should override contract code and data', async function () {
    const GreeterFactory = await ethers.getContractFactory('Greeter')
    const GreeterForUpgradeTestFactory = await ethers.getContractFactory('GreeterForUpgradeTest')

    const names = ['John', 'Mary'];
    const initArgs = [names[0]];
    const contract = await upgrades.deployProxy(GreeterFactory, initArgs, { kind: 'uups' })
    await contract.deployed()

    expect(await contract.greet()).to.equal('Hello ' + names[0])

    const contract1 = await upgrades.upgradeProxy(contract.address, GreeterForUpgradeTestFactory)
    await contract1.setName1(names[1])
    expect(await contract.greet()).to.equal('Hello ' + names[1])
  })
})
