// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol";

contract IBTToken is ERC20, Ownable {
    constructor() ERC20("Token", "IBT") Ownable(msg.sender) {
        _mint(msg.sender, 1000000 * 10**18);
    }

    // here we create tokens
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount); //inherited function
    }

    // the burn functionality
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}