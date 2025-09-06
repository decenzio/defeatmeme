// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MinimalForwarder as OZMinimalForwarder} from "@openzeppelin/contracts/metatx/MinimalForwarder.sol";

/**
 * @title MinimalForwarder
 * @notice Thin wrapper around OpenZeppelin MinimalForwarder to ensure it's compiled and deployable.
 */
contract MinimalForwarder is OZMinimalForwarder {}


