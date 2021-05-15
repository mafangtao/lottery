const Lottery = artifacts.require("Lottery");
const { deployProxy} = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer) {
    await deployProxy(Lottery, [], {deployer, initializer:'initialize'});
};
