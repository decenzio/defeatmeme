// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC2771Context} from "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

interface IPlanetNFT {
    function REGISTRAR_ROLE() external view returns (bytes32);
    function mintTo(address to) external returns (uint256 tokenId);
    function getPlanetIdByOwner(address owner) external view returns (uint256);
}

/**
 * @title GameRegistrar
 * @notice Gasless first-login registration. If caller has no planet, mint one.
 *         Forwarded via OZ MinimalForwarder so msg.sender is the EOA.
 */
contract GameRegistrar is ERC2771Context, AccessControl {
    IPlanetNFT public immutable planet;

    event Registered(address indexed player, uint256 planetId);

    constructor(address trustedForwarder, address planetNFT)
    ERC2771Context(trustedForwarder)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        planet = IPlanetNFT(planetNFT);
    }

    /**
     * @dev Idempotent: returns existing ID if already registered.
     */
    function register() external returns (uint256 id) {
        address player = _msgSender();
        id = planet.getPlanetIdByOwner(player);
        if (id != 0) return id;
        id = planet.mintTo(player);
        emit Registered(player, id);
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
