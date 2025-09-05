// deploy/00_forwarder.ts
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log("🚀 Deploying OpenZeppelin MinimalForwarder (OZ v4.9.6) …");
  await deploy("MinimalForwarder", {
    from: deployer,
    // NOTE: fully-qualified name points at node_modules
    contract: "@openzeppelin/contracts/metatx/MinimalForwarder.sol:MinimalForwarder",
    args: [],
    log: true,
  });
};

export default func;
func.tags = ["Forwarder"];
