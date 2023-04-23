// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "../contracts/Greeter.sol";
import "../contracts/GreeterForUpgradeTest.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';

contract GreeterTest is Test {
    function setUp() public {}

    function deployProxy() internal returns (Greeter) {
        Greeter impl = new Greeter();
        // NOTE: hard coding initArgs
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), abi.encodeWithSelector(Greeter.initialize.selector, "John"));
        return Greeter(address(proxy));
    }

    function upgradeProxy(ERC1967Proxy proxy, address newImpl) internal returns (GreeterForUpgradeTest) {
        UUPSUpgradeable p = UUPSUpgradeable(address(proxy));
        p.upgradeTo(address(newImpl));
        return GreeterForUpgradeTest(address(proxy));
    }

    function testProxy() public {
        Greeter g = deployProxy();
        assertEq(g.greet(), "Hello John");

        GreeterForUpgradeTest newImpl = new GreeterForUpgradeTest();
        GreeterForUpgradeTest g1 = upgradeProxy(ERC1967Proxy(payable(address(g))), address(newImpl));
        g1.setName1("Mary");
        assertEq(g1.greet(), "Hello Mary");
        assertEq(address(g1), address(g));
    }
}
