// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./AggregatorV3Interface.sol";

contract GameEngine is Ownable {
    uint8 public immutable WAVE_COUNT;
    uint8 public immutable WAVE_SIZE;
    uint16 public immutable TOTAL_ENEMIES; // WAVE_COUNT * WAVE_SIZE
    uint40 public immutable TIMEOUT_BLOCKS;

    uint8 public enemyTypesCount; // client maps [0..enemyTypesCount-1] -> image file

    // Chainlink Price Feed Addresses
    AggregatorV3Interface internal ethPriceFeed;
    AggregatorV3Interface internal btcPriceFeed;
    AggregatorV3Interface internal pufEthPriceFeed;

    // Price feeds enabled flag
    bool public priceFeedsEnabled;

    struct Session {
        bytes32 seed;
        uint40 startBlock;
        bool exists;
    }

    struct Play {
        bytes32 seed;
        uint40 startBlock;
        uint40 endBlock;
        uint8[] counts; // length == enemyTypesCount at the time of play
    }

    mapping(address => Session) private _activeSession;
    mapping(address => Play[]) private _plays;

    uint256 private _nonce;

    constructor(
        uint8 _enemyTypesCount,
        uint8 _waveCount,
        uint8 _waveSize,
        uint40 _timeoutBlocks
    ) Ownable() {
        require(_enemyTypesCount > 0, "enemy types = 0");
        enemyTypesCount = _enemyTypesCount;
        WAVE_COUNT = _waveCount;
        WAVE_SIZE = _waveSize;
        TOTAL_ENEMIES = uint16(uint256(_waveCount) * uint256(_waveSize));
        TIMEOUT_BLOCKS = _timeoutBlocks;

        // Initialize Chainlink price feeds (only if addresses are valid)
        if (_areValidAddresses()) {
            ethPriceFeed = AggregatorV3Interface(0x72266eFcdd0EC7110b44576e5413EF383950EEc2);
            btcPriceFeed = AggregatorV3Interface(0xCfd39de761508A7aCb8C931b959127a1D9d0B3D4);
            pufEthPriceFeed = AggregatorV3Interface(0xE7e734789954e6CffD8C295CBD0916A0A5747D27);
            priceFeedsEnabled = true;
        } else {
            priceFeedsEnabled = false;
        }
    }

    // --- Admin ---

    function setEnemyTypesCount(uint8 newCount) external onlyOwner {
        require(newCount > 0, "enemy types = 0");
        enemyTypesCount = newCount;
    }

    function setPriceFeeds(
        address _ethPriceFeed,
        address _btcPriceFeed,
        address _pufEthPriceFeed
    ) external onlyOwner {
        ethPriceFeed = AggregatorV3Interface(_ethPriceFeed);
        btcPriceFeed = AggregatorV3Interface(_btcPriceFeed);
        pufEthPriceFeed = AggregatorV3Interface(_pufEthPriceFeed);
        priceFeedsEnabled = true; // Enable when manually set
    }

    function disablePriceFeeds() external onlyOwner {
        priceFeedsEnabled = false;
    }

    // --- Helper Functions ---

    function _areValidAddresses() internal view returns (bool) {
        // Simple check to see if we're on a network that has these contracts
        // This is a basic heuristic - in production you'd want more robust checks
        return block.chainid != 31337 && block.chainid != 1337; // Exclude Hardhat and Ganache
    }

    // --- Price Feed Functions ---

    function getLatestPrices() public view returns (int256 ethPrice, int256 btcPrice, int256 pufEthPrice) {
        if (!priceFeedsEnabled) {
            // Return fallback values when price feeds are disabled
            return (2000 * 10**8, 40000 * 10**8, 1800 * 10**8); // Mock prices in 8 decimal format
        }

        try ethPriceFeed.latestRoundData() returns (uint80, int256 _ethPrice, uint256, uint256, uint80) {
            ethPrice = _ethPrice;
        } catch {
            ethPrice = 2000 * 10**8; // Fallback ETH price
        }

        try btcPriceFeed.latestRoundData() returns (uint80, int256 _btcPrice, uint256, uint256, uint80) {
            btcPrice = _btcPrice;
        } catch {
            btcPrice = 40000 * 10**8; // Fallback BTC price
        }

        try pufEthPriceFeed.latestRoundData() returns (uint80, int256 _pufEthPrice, uint256, uint256, uint80) {
            pufEthPrice = _pufEthPrice;
        } catch {
            pufEthPrice = 1800 * 10**8; // Fallback pufETH price
        }
    }

    function generateEnhancedRandomness() internal view returns (bytes32) {
        // Get latest prices from Chainlink oracles
        (int256 ethPrice, int256 btcPrice, int256 pufEthPrice) = getLatestPrices();

        // Combine multiple sources of randomness:
        // 1. Previous block hash
        // 2. Current block's prevrandao
        // 3. Player address
        // 4. Nonce
        // 5. ETH price
        // 6. BTC price
        // 7. pufETH price
        // 8. Block timestamp
        return keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            block.prevrandao,
            msg.sender,
            _nonce,
            ethPrice,
            btcPrice,
            pufEthPrice,
            block.timestamp
        ));
    }

    // --- Session lifecycle ---

    function hasActiveSession(address player) public view returns (bool) {
        Session memory s = _activeSession[player];
        if (!s.exists) return false;
        if (block.number > s.startBlock + TIMEOUT_BLOCKS) return false;
        return true;
    }

    function getActiveSession(address player) external view returns (bytes32 seed, uint40 startBlock, uint40 deadline, bool active) {
        Session memory s = _activeSession[player];
        if (!s.exists) {
            return (bytes32(0), 0, 0, false);
        }
        uint40 dl = s.startBlock + TIMEOUT_BLOCKS;
        bool isActive = block.number <= dl;
        return (s.seed, s.startBlock, dl, isActive);
    }

    function startGame() external {
        require(enemyTypesCount > 0, "no enemies");
        // Enforce one active session; allow restart if expired
        Session memory s = _activeSession[msg.sender];
        if (s.exists) {
            require(block.number > s.startBlock + TIMEOUT_BLOCKS, "active session");
        }

        // Enhanced randomness using Chainlink price feeds + blockchain data
        _nonce++;
        bytes32 seed = generateEnhancedRandomness();
        _activeSession[msg.sender] = Session({ seed: seed, startBlock: uint40(block.number), exists: true });
    }

    // Returns the full schedule (150 uint8 IDs) for the caller's active session
    function getMySchedule() external view returns (uint8[] memory seq) {
        return getScheduleFor(msg.sender);
    }

    function getScheduleFor(address player) public view returns (uint8[] memory seq) {
        Session memory s = _activeSession[player];
        require(s.exists, "no session");
        seq = new uint8[](TOTAL_ENEMIES);
        for (uint16 i = 0; i < TOTAL_ENEMIES; i++) {
            uint256 r = uint256(keccak256(abi.encodePacked(s.seed, i)));
            seq[i] = uint8(r % enemyTypesCount);
        }
    }

    // Submit results; stores the play and clears session
    function submitResults(uint8[] calldata counts) external {
        Session memory s = _activeSession[msg.sender];
        require(s.exists, "no session");
        require(block.number <= s.startBlock + TIMEOUT_BLOCKS, "session expired");
        require(counts.length == enemyTypesCount, "bad length");

        // Store the play
        uint8[] memory copy = new uint8[](counts.length);
        for (uint256 i = 0; i < counts.length; i++) {
            copy[i] = counts[i];
        }
        _plays[msg.sender].push(Play({
            seed: s.seed,
            startBlock: s.startBlock,
            endBlock: uint40(block.number),
            counts: copy
        }));

        delete _activeSession[msg.sender];
    }

    // --- History ---

    function getPlaysCount(address player) external view returns (uint256) {
        return _plays[player].length;
    }

    function getPlay(address player, uint256 index) external view returns (bytes32 seed, uint40 startBlock, uint40 endBlock, uint8[] memory counts) {
        Play storage p = _plays[player][index];
        return (p.seed, p.startBlock, p.endBlock, p.counts);
    }
}