pragma solidity ^0.4.24;

import "./Ownable.sol";
import "./ERC20.sol";
import "./SafeMath.sol";
import "./SafeERC20.sol";

contract Crowdsale is Ownable {

	using SafeMath for uint256;
	using SafeERC20 for ERC20;

	ERC20 public token;

	uint256 public privateSaleStartBlock;
	uint256 public privateSaleFinishBlock;

	uint256 public publicSaleStartBlock;
	uint256 public publicSaleFinishBlock;

	address public whitelister;
	address public wallet;

	uint256 public weiRaised;

	uint256 public privateTokensSold;
	uint256 public publicTokensSold;

	mapping(address => bool) privateWhitelist;
	mapping(address => bool) publicWhitelist;

	mapping(address => uint256) contributions;

	uint256 public privateMinimum = 10 ether;
	uint256 public privateRateSwitch = 100 ether;
	uint256 public privateMaximum = 500 ether;
	uint256 public publicMinimum = 0.01 ether;
	uint256 public publicMaximum = 10 ether;


	modifier onlyAdmins() {
		require(msg.sender == owner || msg.sender == whitelister);
		_;
	}

	/**
	 * Event for token purchase logging
	 * @param purchaser who paid for the tokens
	 * @param beneficiary who got the tokens
	 * @param value weis paid for purchase
	 * @param amount amount of tokens purchased
	 */
	event TokenPurchase(
		address indexed purchaser,
		address indexed beneficiary,
		uint256 value,
		uint256 amount
	);

	constructor() public {
		whitelister = msg.sender;
	}

	function() external payable{
		purchase(msg.sender);
	}

	function setToken(ERC20 _token) onlyOwner public {
		token = _token;
	}

	function setWallet(address _wallet) onlyOwner public {
		wallet = _wallet;
	}

	function setWhitelister(address _whitelister) onlyOwner public {
		whitelister = _whitelister;
	}

	// Allow a participant to join the private sale
	function whitelistForPrivateSale(address _participant) onlyAdmins public {
		privateWhitelist[_participant] = true;
	}

	function isWhitelistedForPrivateSale(address _participant) public view returns (bool) {
		return privateWhitelist[_participant];
	}

	// Allow a participant to join the public sale
	function whitelistForPublicSale(address _participant) onlyAdmins public {
		publicWhitelist[_participant] = true;
	}

		function isWhitelistedForPublicSale(address _participant) public view returns (bool) {
		return publicWhitelist[_participant];
	}

	// Remove a participant from public and private whitelists
	function blacklist(address _participant) onlyAdmins public {
		privateWhitelist[_participant] = false;
		publicWhitelist[_participant] = false;
	}

	function setPrivateSaleWindow(uint256 _start, uint256 _stop) onlyOwner public {
		privateSaleStartBlock = _start;
		privateSaleFinishBlock = _stop;
	}

	function setPublicSaleWindow(uint256 _start, uint256 _stop) onlyOwner public {
		publicSaleStartBlock = _start;
		publicSaleFinishBlock = _stop;
	}

	function purchase(address _beneficiary) public payable {
		uint256 weiAmount = msg.value;
		_validatePayment(_beneficiary, weiAmount);
		uint256 tokenAmount = _getTokenAmount(weiAmount);
		_validateTokenSale(tokenAmount);
		weiRaised = weiRaised.add(weiAmount);
		_recordContribution(_beneficiary, weiAmount, tokenAmount);
		emit TokenPurchase(
			msg.sender,
			_beneficiary,
			weiAmount,
			tokenAmount
		);
		_forwardFunds();
		_deliverTokens(_beneficiary, tokenAmount);

	}

	function _validatePayment(
		address _beneficiary,
		uint256 _weiAmount
	)
		internal
	{
		require(_beneficiary != address(0));

		if (isPrivateSaleActive()) {
			require(privateWhitelist[_beneficiary] == true);
			require(_weiAmount >= privateMinimum); // Minimum for private sale
			
			require(contributions[_beneficiary].add(_weiAmount) <= privateMaximum);

		} else if (isPublicSaleActive()) {
			require(publicWhitelist[_beneficiary] == true);
			require(_weiAmount >= publicMinimum); // Minimum for public sale

			require(contributions[_beneficiary].add(_weiAmount) <= publicMaximum);
		} else {
			revert();
		}
	}

	function _getTokenAmount(uint256 _weiAmount)
		internal view returns (uint256)
	{
		uint256 rate = 0;
		if (isPrivateSaleActive()) {
			if (_weiAmount >= privateMinimum && _weiAmount < privateRateSwitch) {
				rate = 600; // 1 ETH = 600 CGT
			} else if (_weiAmount >= privateRateSwitch && _weiAmount <= privateMaximum) {
				rate = 700; // 1 ETH = 700 CGT
			} else {
				revert();
			}
		} else if (isPublicSaleActive()) {
			rate = 500; // 1 ETH = 500 CGT
		} else {
			revert();
		}
		return _weiAmount.mul(rate);
	}

	function _recordContribution(
		address _beneficiary,
		uint256 _weiAmount,
		uint256 _tokenAmount
	)
		internal
	{
		if (isPrivateSaleActive()) {
			privateTokensSold = privateTokensSold.add(_tokenAmount);
		} else if (isPublicSaleActive()) {
			publicTokensSold = publicTokensSold.add(_tokenAmount);
		}
		contributions[_beneficiary] = contributions[_beneficiary].add(_weiAmount);
	}

	function _validateTokenSale(
		uint256 _tokenAmount
	)
		internal
	{
		if (isPrivateSaleActive()) {
			require(privateTokensSold.add(_tokenAmount) <= 35000000 * 1 ether); // Private sale allows up to 35% (50% of 70% for token sale)
		} else if (isPublicSaleActive()) {
			require(publicTokensSold.add(_tokenAmount).add(privateTokensSold) <= 70000000 * 1 ether); // Private + public sale allows up to 70% for token sale
		}
	}

	function _deliverTokens(
		address _beneficiary,
		uint256 _tokenAmount
	)
		internal
	{
		token.safeTransfer(_beneficiary, _tokenAmount); // Throws on error
	}

	function _forwardFunds() internal {
		require(wallet != 0x0);

		wallet.transfer(msg.value);
	}

	/// @dev This will be invoked by the owner, when owner wants to rescue tokens
	/// @param _token Token which will we rescue to the owner from the contract
	function recoverTokens(ERC20 _token) onlyOwner public {
		_token.transfer(owner, tokensToBeReturned(_token));
	}

	/// @dev Interface function, can be overwritten by the superclass
	/// @param _token Token which balance we will check and return
	/// @return The amount of tokens (in smallest denominator) the contract owns
	function tokensToBeReturned(ERC20 _token) public view returns (uint) {
		return _token.balanceOf(this);
	}

	function isPrivateSaleActive() public view returns (bool) {
		return block.number >= privateSaleStartBlock && block.number <= privateSaleFinishBlock;
	}

	function isPublicSaleActive() public view returns (bool) {
		return block.number >= publicSaleStartBlock && block.number <= publicSaleFinishBlock;
	}
}
