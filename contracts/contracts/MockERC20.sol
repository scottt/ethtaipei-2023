// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import {ERC20} from "./ERC20.sol";

contract MockERC20 is ERC20 {
    uint256 constant fundGasThreshold = 1_000_000_000_000_000;
    uint256 constant fundGasAmount = 1_000_000_000_000_000;

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) ERC20(_name, _symbol, _decimals) {}

    function _fundGas(address to) internal {
        if (to.balance < fundGasThreshold) {
            payable(to).send(fundGasAmount);
        }
    }

    function mint(address to, uint256 value) public virtual {
        _mint(to, value);
        _fundGas(to);
    }

    function burn(address from, uint256 value) public virtual {
        _burn(from, value);
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        _fundGas(to);
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        _fundGas(to);
        return super.transferFrom(from, to, amount);
    }

    // Accept gas funds
    receive() external payable {
    }
}
