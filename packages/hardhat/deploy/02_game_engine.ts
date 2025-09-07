import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get, execute, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const planet = await get("PlanetNFT");

  // enemyTypesCount=9 (from public/game/memes), waves=30, waveSize=5, timeoutBlocks=40
  const forwarder = await deployments.get("MinimalForwarder");
  const engine = await deploy("GameEngine", {
    from: deployer,
    args: [planet.address, 9, 10, 5, 40, forwarder.address],
    log: true,
    autoMine: true,
  });

  // Wire GameEngine to PlanetNFT to allow recording results
  await execute("PlanetNFT", { from: deployer, log: true }, "setGameEngine", engine.address);

  // Disable price feeds on testnet (Redstone feeds don't exist on Zircuit Garfield)
  if (hre.network.name === "zircuitGarfieldTestnet") {
    await execute("GameEngine", { from: deployer, log: true }, "disablePriceFeeds");
    //log(`🔧 Disabled price feeds for testnet deployment`);
  }

  // Ensure GameEngine points to the current PlanetNFT (in case of reused engine after Planet redeploy)
  try {
    const currentPlanet = (await deployments.read("GameEngine", "planetNFT")) as string;
    if (currentPlanet.toLowerCase() !== planet.address.toLowerCase()) {
      try {
        await execute("GameEngine", { from: deployer, log: true }, "setPlanetNFT", planet.address);
        log(`🔧 Updated GameEngine.planetNFT to ${planet.address}`);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        log(
          `⚠️ GameEngine.planetNFT mismatch (${currentPlanet} vs ${planet.address}) but setPlanetNFT is unavailable. Consider redeploying GameEngine.`,
        );
      }
    }
  } catch {}

  log(`✅ GameEngine deployed at ${engine.address} and wired to PlanetNFT ${planet.address}`);
};

export default func;
func.tags = ["GameEngine"];
