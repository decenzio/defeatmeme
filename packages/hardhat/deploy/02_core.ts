import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy, get, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const fwd = await get("MinimalForwarder");

  const planet = await deploy("PlanetNFT", {
    from: deployer,
    args: [fwd.address, "ipfs://YOUR_BASE_CID/"],
    log: true,
  });

  const registrar = await deploy("GameRegistrar", {
    from: deployer,
    args: [fwd.address, planet.address],
    log: true,
  });

  const planetCtr = await ethers.getContractAt("PlanetNFT", planet.address);
  const REGISTRAR_ROLE = await planetCtr.REGISTRAR_ROLE();
  await (await planetCtr.grantRole(REGISTRAR_ROLE, registrar.address)).wait();
  log(`✅ REGISTRAR_ROLE granted to ${registrar.address}`);
};

export default func;
func.tags = ["Core"];
func.dependencies = ["Forwarder"];
