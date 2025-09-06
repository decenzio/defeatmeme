import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const forwarder = await deployments.get("MinimalForwarder");

  const baseUri = process.env.PLANET_BASE_URI || "ipfs://YOUR_BASE_CID/";
  if (baseUri.includes("YOUR_BASE_CID") && hre.network.name !== "localhost") {
    log(
      `⚠️  PLANET_BASE_URI is not set. Using placeholder base URI. Set PLANET_BASE_URI in .env before deploying to live networks.`,
    );
  }

  const planet = await deploy("PlanetNFT", {
    from: deployer,
    args: [baseUri, forwarder.address], // baseURI, trustedForwarder
    log: true,
  });

  log(`✅ PlanetNFT deployed at ${planet.address}`);
  log(`🌍 Users can now mint planets directly by calling mint() function`);
};

func.tags = ["PlanetNFT"];

export default func;
