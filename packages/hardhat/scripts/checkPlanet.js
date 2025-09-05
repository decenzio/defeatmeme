const fwd = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const reg = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
const pla = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const player = "0x13F89c2683380Cc1C321c72ec3151f10df4EdB2b"; // your wallet in UI

const Planet = await ethers.getContractAt("PlanetNFT", pla);
const Registrar = await ethers.getContractAt("GameRegistrar", reg);

(await Registrar.isTrustedForwarder(fwd)).toString(); // expect true
const role = await Planet.REGISTRAR_ROLE();
await Planet.hasRole(role, reg); // expect true
(await Planet.getPlanetIdByOwner(player)).toString(); // should be "0" before mint
