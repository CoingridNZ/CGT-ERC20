var CoingridContract = artifacts.require("Coingrid");
var CrowdsaleContract = artifacts.require("Crowdsale");
let tryCatch = require("./helpers/helpers.js").tryCatch;
let errTypes = require("./helpers/helpers.js").errTypes;

let ether = 10**18;

let ZERO_ADDRESS = 0x0000000000000000000000000000000000000000

contract("Coingrid", function(accounts) {
	let owner = accounts[0];

	let coingrid;
	let crowdsale;

	let privateParticipant = accounts[1];
	let publicParticipant = accounts[2];
	let whitelister = accounts[3];

	let nobody = accounts[9];

	it("gave 100,000,000 CGT to owner", async function() {
		coingrid = await CoingridContract.new({from: owner});
		crowdsale = await CrowdsaleContract.new({from: owner});

		web3.eth.sendTransaction({from: nobody, value: web3.toWei(50), to: privateParticipant});

		ownerBalance = await coingrid.balanceOf.call(owner);

		assert.equal(100000000 * ether, ownerBalance.toNumber(), "Did not receive 100,000,000 CGT at owner address");
	});

	it("is paused", async function() {
		paused = await coingrid.paused.call();

		assert.equal(paused, true, "CGT was not paused");
	});

	it("allows owner to set crowdsale", async function() {
		await coingrid.setCrowdsale(crowdsale.address, {from: owner});

		crowdsaleAddress = await coingrid.crowdsale.call();

		assert.equal(crowdsaleAddress, crowdsale.address, "Crowdsale address did not update");
	});

	it("does not allow non-owner to set crowdsale", async function() {
		await tryCatch(coingrid.setCrowdsale(ZERO_ADDRESS, {from: nobody}), errTypes.revert);
	});

	it("does not allow transfer when paused", async function() {
		await tryCatch(coingrid.transfer(nobody, 100, {from: owner}), errTypes.revert);
	});

	it("does not allow non-owner to unpause", async function() {
		await tryCatch(coingrid.unpause({from: nobody}), errTypes.revert);
	});

	it("allows owner to unpause", async function() {
		await coingrid.unpause({from: owner});

		paused = await coingrid.paused.call();

		assert.equal(paused, false, "CGT was not unpaused");
	});

	it("does not allow non-owner to pause", async function() {
		await tryCatch(coingrid.pause({from: nobody}), errTypes.revert);
	});

	it("allows owner to pause", async function() {
		await coingrid.pause({from: owner});

		paused = await coingrid.paused.call();

		assert.equal(paused, true, "CGT was not paused");

		await coingrid.unpause({from: owner});
	});

	it("allows transfer when unpaused", async function() {
		await coingrid.transfer(crowdsale.address, 70000000 * ether, {from: owner});

		crowdsaleBalance = await coingrid.balanceOf.call(crowdsaleAddress);
		ownerBalance = await coingrid.balanceOf.call(owner);

		assert.equal(30000000 * ether, ownerBalance.toNumber(), "Owner balance did not decrease");
		assert.equal(70000000 * ether, crowdsaleBalance.toNumber(), "Crowdsale balance did not increase");

		await coingrid.pause({from: owner});
	});

	it("allows owner to set whitelister", async function() {
		await crowdsale.setWhitelister(whitelister, {from: owner});

		whitelisterAddress = await crowdsale.whitelister.call();

		assert.equal(whitelisterAddress, whitelister, "Whitelister did not change");
	});

	it("does not allow non-owner to set whitelister", async function() {
		await tryCatch(crowdsale.setWhitelister(ZERO_ADDRESS, {from: nobody}), errTypes.revert);
	});

	it("allows owner to set wallet", async function() {
		await crowdsale.setWallet(owner, {from: owner});

		walletAddress = await crowdsale.wallet.call();

		assert.equal(walletAddress, owner, "Wallet did not change");
	});

	it("does not allow non-owner to set wallet", async function() {
		await tryCatch(crowdsale.setWallet(ZERO_ADDRESS, {from: nobody}), errTypes.revert);
	});

	it("allows owner to set token", async function() {
		await crowdsale.setToken(coingrid.address, {from: owner});

		tokenAddress = await crowdsale.token.call();

		assert.equal(tokenAddress, coingrid.address, "Token did not change");
	});

	it("does not allow non-owner to set token", async function() {
		await tryCatch(crowdsale.setToken(ZERO_ADDRESS, {from: nobody}), errTypes.revert);
	});

	it("allows owner to whitelist private participant", async function() {
		await crowdsale.whitelistForPrivateSale(privateParticipant, {from: owner});

		whitelisted = await crowdsale.isWhitelistedForPrivateSale.call(privateParticipant);

		assert.equal(whitelisted, true, "Paricipant was not whitelisted");
	});

	it("does not allow non-owner to whitelist private participant", async function() {
		await tryCatch(crowdsale.whitelistForPrivateSale(nobody, {from: nobody}), errTypes.revert);
	});

	it("allows owner to blacklist participant", async function() {
		await crowdsale.blacklist(privateParticipant, {from: owner});

		whitelisted = await crowdsale.isWhitelistedForPrivateSale.call(privateParticipant);

		assert.equal(whitelisted, false, "Paricipant was not blacklisted");
	});

	it("allows whitelister to whitelist private participant", async function() {
		await crowdsale.whitelistForPrivateSale(privateParticipant, {from: whitelister});

		whitelisted = await crowdsale.isWhitelistedForPrivateSale.call(privateParticipant);

		assert.equal(whitelisted, true, "Paricipant was not whitelisted");
	});

	it("allows whitelister to blacklist participant", async function() {
		await crowdsale.blacklist(privateParticipant, {from: whitelister});

		whitelisted = await crowdsale.isWhitelistedForPrivateSale.call(privateParticipant);

		assert.equal(whitelisted, false, "Paricipant was not blacklisted");

		await crowdsale.whitelistForPrivateSale(privateParticipant, {from: whitelister});
	});

	it("allows owner to set private sale window", async function() {
		let block = await web3.eth.getBlock("latest").number;

		await crowdsale.setPrivateSaleWindow(block, block + 6, {from: owner});

		windowStart = await crowdsale.privateSaleStartBlock.call();
		windowFinish = await crowdsale.privateSaleFinishBlock.call();

		assert.equal(windowStart, block, "Start block incorrect");
		assert.equal(windowFinish, block + 6, "Finish block incorrect");

	});

	it("does not allow non-owner to set private sale window", async function() {
		await tryCatch(crowdsale.setPrivateSaleWindow(1, 2, {from: nobody}), errTypes.revert);
	});

	it("rejects contribution from blacklisted address for private sale", async function() {
		await tryCatch(crowdsale.sendTransaction({from: nobody, value: web3.toWei(11)}), errTypes.revert);
	});

	it("rejects less than minimum private amount for private sale", async function() {
		var minimum = await crowdsale.privateMinimum.call();
		var amount =  minimum - web3.toWei(1);
		await tryCatch(crowdsale.sendTransaction({from: privateParticipant, value: amount}), errTypes.revert);
	});

	it("accepts minimum private amount for private sale", async function() {
		var minimum = await crowdsale.privateMinimum.call();
		ownerBalanceETH = web3.eth.getBalance(owner);
		await crowdsale.sendTransaction({from: privateParticipant, value: minimum});
		ownerBalanceETHAfter = web3.eth.getBalance(owner);

		crowdsaleBalance = await coingrid.balanceOf.call(crowdsaleAddress);
		privateParticipantBalance = await coingrid.balanceOf.call(privateParticipant);

		assert.equal(ownerBalanceETH, ownerBalanceETHAfter - minimum, "Owner balance did not increase");

		assert.equal(6000 * ether, privateParticipantBalance.toNumber(), "Paricipant balance did not increase");
		assert.equal(69994000 * ether, crowdsaleBalance.toNumber(), "Crowdsale balance did not decrease");
	});

	it("accepts rate change amount for private sale", async function() {
		var rateChangeAmount = await crowdsale.privateRateSwitch.call();
		ownerBalanceETH = web3.eth.getBalance(owner);
		await crowdsale.sendTransaction({from: privateParticipant, value: rateChangeAmount});
		ownerBalanceETHAfter = web3.eth.getBalance(owner);

		crowdsaleBalance = await coingrid.balanceOf.call(crowdsaleAddress);
		privateParticipantBalance = await coingrid.balanceOf.call(privateParticipant);

		assert.equal(ownerBalanceETH.toNumber(), ownerBalanceETHAfter - rateChangeAmount, "Owner balance did not increase");

		assert.equal((6000 + 70000) * ether, privateParticipantBalance.toNumber(), "Paricipant balance did not increase");
		assert.equal((69994000 - 70000) * ether, crowdsaleBalance.toNumber(), "Crowdsale balance did not decrease");
	});

	it("rejects private contribution outside window", async function() {
		await tryCatch(crowdsale.sendTransaction({from: privateParticipant, value: web3.toWei(10)}), errTypes.revert);
	});

	it("allows owner to whitelist public participant", async function() {
		await crowdsale.whitelistForPublicSale(publicParticipant, {from: owner});

		whitelisted = await crowdsale.isWhitelistedForPublicSale.call(publicParticipant);

		assert.equal(whitelisted, true, "Paricipant was not whitelisted");
	});

	it("does not allow non-owner to whitelist public participant", async function() {
		await tryCatch(crowdsale.whitelistForPublicSale(nobody, {from: nobody}), errTypes.revert);
	});

	it("allows whitelister to whitelist public participant", async function() {
		await crowdsale.blacklist(publicParticipant, {from: owner});
		await crowdsale.whitelistForPublicSale(publicParticipant, {from: whitelister});

		whitelisted = await crowdsale.isWhitelistedForPublicSale.call(publicParticipant);

		assert.equal(whitelisted, true, "Paricipant was not whitelisted");
	});

	it("allows owner to set public sale window", async function() {
		let block = await web3.eth.getBlock("latest").number;

		await crowdsale.setPublicSaleWindow(block, block + 6, {from: owner});

		windowStart = await crowdsale.publicSaleStartBlock.call();
		windowFinish = await crowdsale.publicSaleFinishBlock.call();

		assert.equal(windowStart, block, "Start block incorrect");
		assert.equal(windowFinish, block + 6, "Finish block incorrect");

	});

	it("does not allow non-owner to set public sale window", async function() {
		await tryCatch(crowdsale.setPublicSaleWindow(1, 2, {from: nobody}), errTypes.revert);
	});

	it("rejects less than public minimum for public sale", async function() {
		var minimum = await crowdsale.publicMinimum.call();
		var amount = minimum - web3.toWei(0.0001);
		await tryCatch(crowdsale.sendTransaction({from: publicParticipant, value: amount}), errTypes.revert);
	});

	it("accepts public minimum for public sale", async function() {
		var minimum = await crowdsale.publicMinimum.call();
		ownerBalanceETH = web3.eth.getBalance(owner);
		txr = await crowdsale.sendTransaction({from: publicParticipant, value: minimum});
		ownerBalanceETHAfter = web3.eth.getBalance(owner);

		crowdsaleBalance = await coingrid.balanceOf.call(crowdsaleAddress);
		publicParticipantBalance = await coingrid.balanceOf.call(publicParticipant);

		assert.equal(ownerBalanceETH, ownerBalanceETHAfter - minimum, "Owner balance did not increase");

		assert.equal(5 * ether, publicParticipantBalance.toNumber(), "Paricipant balance did not increase");
		assert.equal((69994000 - 70000 - 5) * ether, crowdsaleBalance.toNumber(), "Crowdsale balance did not decrease");
	});

	it("rejects more than public maximum for public sale", async function() {
		var maximum = await crowdsale.publicMaximum.call();
		var amount = maximum.plus(web3.toWei(1));
		await tryCatch(crowdsale.sendTransaction({from: nobody, value: amount}), errTypes.revert);
	});

	it("rejects contribution from blacklisted address for public sale", async function() {
		await tryCatch(crowdsale.sendTransaction({from: nobody, value: web3.toWei(1)}), errTypes.revert);
	});

	it("rejects public contribution outside window", async function() {
		await tryCatch(crowdsale.sendTransaction({from: publicParticipant, value: web3.toWei(1)}), errTypes.revert);
	});

});