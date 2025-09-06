// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PlanetNFT
 * @notice Simple Planet NFT - one per wallet, users mint directly
 */
contract PlanetNFT is ERC721, Ownable {
    // Each EOA can hold at most one planet; 0 means none.
    mapping(address => uint256) public ownedPlanet;

    uint256 private _nextId = 1;
    string private _baseTokenURI;
    
    // Minting price (0 for free minting)
    uint256 public mintPrice = 0;
    
    event PlanetMinted(address indexed owner, uint256 indexed tokenId);

    constructor(string memory baseURI) 
    ERC721("DefeatMeme Planet", "PLANET") 
    Ownable()
    {
        _baseTokenURI = baseURI;
    }

    function setBaseURI(string calldata newBase) external onlyOwner {
        _baseTokenURI = newBase;
    }
    
    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
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
        require(ownedPlanet[msg.sender] == 0, "Planet: already own a planet");
        
        tokenId = _nextId++;
        _safeMint(msg.sender, tokenId);
        ownedPlanet[msg.sender] = tokenId;
        
        emit PlanetMinted(msg.sender, tokenId);
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
     * @dev Withdraw contract balance (only owner)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Planet: no funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Planet: withdrawal failed");
    }
}
