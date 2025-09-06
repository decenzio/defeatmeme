import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // enemyTypesCount=9 (from public/game/memes), waves=30, waveSize=5, timeoutBlocks=40
  await deploy("GameEngine", {
    from: deployer,
    args: [9, 30, 5, 40],
    log: true,
    autoMine: true,
  });
};

export default func;
func.tags = ["GameEngine"];
