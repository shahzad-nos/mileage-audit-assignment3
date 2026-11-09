const MileageAudit = artifacts.require("MileageAudit");

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(MileageAudit, accounts[1], {
    from: accounts[0]
  });
};