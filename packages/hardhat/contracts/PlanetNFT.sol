// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC2771Context} from "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

/**
 * @title PlanetNFT
 * @notice Minimal per-wallet Planet NFT with 2771 meta-tx support.
 */
contract PlanetNFT is ERC2771Context, ERC721, AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    // Each EOA can hold at most one planet; 0 means none.
    mapping(address => uint256) public ownedPlanet;

    uint256 private _nextId = 1;
    string private _baseTokenURI;

    constructor(address trustedForwarder, string memory baseURI)
    ERC2771Context(trustedForwarder)
    ERC721("DefeatMeme Planet", "PLANET")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _baseTokenURI = baseURI;
    }

    function setBaseURI(string calldata newBase) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = newBase;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Mint a planet for `to`. Reverts if they already have one.
     *      Callable by GameRegistrar (holder of REGISTRAR_ROLE).
     */
    function mintTo(address to) external onlyRole(REGISTRAR_ROLE) returns (uint256 tokenId) {
        require(ownedPlanet[to] == 0, "Planet: already registered");
        tokenId = _nextId++;
        _safeMint(to, tokenId);
        ownedPlanet[to] = tokenId;
    }

    function getPlanetIdByOwner(address owner) external view returns (uint256) {
        return ownedPlanet[owner];
    }

    // --- ERC165 / multiple inheritance resolution ---

    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721, AccessControl)
    returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // --- ERC2771 / Context overrides ---

    function _msgSender()
    internal
    view
    override(Context, ERC2771Context)
    returns (address sender)
    {
        sender = ERC2771Context._msgSender();
    }

    function _msgData()
    internal
    view
    override(Context, ERC2771Context)
    returns (bytes calldata)
    {
        return ERC2771Context._msgData();
    }

    function _contextSuffixLength()
    internal
    view
    override(Context, ERC2771Context)
    returns (uint256)
    {
        return ERC2771Context._contextSuffixLength();
    }
}
