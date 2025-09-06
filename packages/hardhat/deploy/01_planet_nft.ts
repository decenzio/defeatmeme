import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const forwarder = await deployments.get("MinimalForwarder");

  const planet = await deploy("PlanetNFT", {
    from: deployer,
    args: ["ipfs://YOUR_BASE_CID/", forwarder.address], // baseURI, trustedForwarder
    log: true,
  });

  log(`✅ PlanetNFT deployed at ${planet.address}`);
  log(`🌍 Users can now mint planets directly by calling mint() function`);
};

func.tags = ["PlanetNFT"];

export default func;
