const { expect} = require('chai');
const { deployProxy, upgradeProxy} = require('@openzeppelin/truffle-upgrades');
// Load compiled artifacts
const Lottery = artifacts.require('Lottery');
const LotteryV2 = artifacts.require('LotteryV2');
const BN = web3.utils.BN;
// Start test block
contract('Lottery Upgrade Test', function () {

  beforeEach(async function () {
    // Deploy a new Box contract for each test
    this.Lottery = await deployProxy(Lottery, [], {initializer: 'initialize'});
    this.LotteryV2 = await upgradeProxy(this.Lottery.address, LotteryV2);
  });
  // Test case
  it('resetMinAmount', async function () {

   await this.LotteryV2.resetMinAmount(2);
   const amount= await this.LotteryV2.minAmount()
   console.log()
   const a1= (Math.pow(10,18)*2).toString()
   expect(new BN(amount).toString()).to.equal(a1);

  });

});

