import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get, execute, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const planet = await get("PlanetNFT");

  // enemyTypesCount=9 (from public/game/memes), waves=30, waveSize=5, timeoutBlocks=40
  const engine = await deploy("GameEngine", {
    from: deployer,
    args: [planet.address, 9, 30, 5, 40],
    log: true,
    autoMine: true,
  });

  // Wire GameEngine to PlanetNFT to allow recording results
  await execute("PlanetNFT", { from: deployer, log: true }, "setGameEngine", engine.address);

  log(`✅ GameEngine deployed at ${engine.address} and wired to PlanetNFT ${planet.address}`);
};

export default func;
func.tags = ["GameEngine"];
