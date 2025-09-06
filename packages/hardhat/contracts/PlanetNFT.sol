// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC2771Context} from "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

/**
 * @title PlanetNFT
 * @notice Simple Planet NFT - one per wallet, users mint directly
 */
contract PlanetNFT is ERC2771Context, ERC721, Ownable {
    // Each EOA can hold at most one planet; 0 means none.
    mapping(address => uint256) public ownedPlanet;

    uint256 private _nextId = 1;
    string private _baseTokenURI;
    
    // Minting price (0 for free minting)
    uint256 public mintPrice = 0;

    // GameEngine authorized writer
    address public gameEngine;

    // Lifetime defeats: tokenId => coinId => count
    mapping(uint256 => mapping(uint8 => uint256)) public lifetimeDefeats;

    // Per-day defeats: tokenId => dayId => coinId => count
    mapping(uint256 => mapping(uint256 => mapping(uint8 => uint256))) public dayDefeats;

    event PlanetMinted(address indexed owner, uint256 indexed tokenId);

    constructor(string memory baseURI, address trustedForwarder)
    ERC721("DefeatMeme Planet", "PLANET")
    Ownable()
    ERC2771Context(trustedForwarder)
    {
        _baseTokenURI = baseURI;
    }

    function setBaseURI(string calldata newBase) external onlyOwner {
        _baseTokenURI = newBase;
    }
    
    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
    }

    function setGameEngine(address ge) external onlyOwner {
        require(ge != address(0), "ge=0");
        gameEngine = ge;
    }

    modifier onlyGameEngine() {
        require(msg.sender == gameEngine, "not engine");
        _;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Mint a planet for the caller. Reverts if they already have one.
     *      Anyone can call this function and mint their own planet.
     */
    function mint() external payable returns (uint256 tokenId) {
        require(msg.value >= mintPrice, "Planet: insufficient payment");
        address sender = _msgSender();
        require(ownedPlanet[sender] == 0, "Planet: already own a planet");

        tokenId = _nextId++;
        _safeMint(sender, tokenId);
        ownedPlanet[sender] = tokenId;

        emit PlanetMinted(sender, tokenId);
    }

    function getPlanetIdByOwner(address owner) external view returns (uint256) {
        return ownedPlanet[owner];
    }
    
    /**
     * @dev Check if an address owns a planet
     */
    function hasPlanet(address owner) external view returns (bool) {
        return ownedPlanet[owner] != 0;
    }
    
    /**
     * @dev Get total number of planets minted
     */
    function totalSupply() external view returns (uint256) {
        return _nextId - 1;
    }

    /**
     * @dev Record per-day and lifetime game results (only GameEngine)
     */
    function recordGameResult(uint256 tokenId, uint256 dayId, uint8[] calldata counts) external onlyGameEngine {
        require(_ownerOf(tokenId) != address(0), "bad token");
        for (uint256 i = 0; i < counts.length; i++) {
            lifetimeDefeats[tokenId][uint8(i)] += counts[i];
            dayDefeats[tokenId][dayId][uint8(i)] += counts[i];
        }
    }

    /**
     * @dev Returns per-day counts as an array sized by `types`
     */
    function getDailyCounts(uint256 tokenId, uint256 dayId, uint8 types) external view returns (uint256[] memory arr) {
        arr = new uint256[](types);
        for (uint8 i = 0; i < types; i++) {
            arr[i] = dayDefeats[tokenId][dayId][i];
        }
    }

    /**
     * @dev Returns lifetime counts as an array sized by `types`
     */
    function getLifetimeCounts(uint256 tokenId, uint8 types) external view returns (uint256[] memory arr) {
        arr = new uint256[](types);
        for (uint8 i = 0; i < types; i++) {
            arr[i] = lifetimeDefeats[tokenId][i];
        }
    }

    /**
     * @dev Withdraw contract balance (only owner)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Planet: no funds to withdraw");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Planet: withdrawal failed");
    }

    // --- ERC2771 overrides ---
    function _msgSender()
        internal
        view
        override(Context, ERC2771Context)
        returns (address sender)
    {
        return ERC2771Context._msgSender();
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
