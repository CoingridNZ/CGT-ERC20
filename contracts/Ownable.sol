pragma solidity ^0.4.24;

contract Ownable {

    address public owner;

    constructor() public {
        owner = msg.sender;
    }

    modifier onlyOwner() {                                                  // to ensure only owner can manipulate a wallet
        require(msg.sender == owner);
        _;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0));                                    // to ensure the owner's address isn't an uninitialised address, "0x0"
        owner = newOwner;
    }
}
