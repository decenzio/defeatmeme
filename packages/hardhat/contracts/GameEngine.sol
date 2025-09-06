// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import { ERC2771Context } from "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import { Context } from "@openzeppelin/contracts/utils/Context.sol";
import "./AggregatorV3Interface.sol";

interface IPlanetNFT {
    function ownedPlanet(address owner) external view returns (uint256);

    function recordGameResult(uint256 tokenId, uint256 dayId, uint8[] calldata counts) external;
}

contract GameEngine is ERC2771Context, Ownable {
    uint8 public immutable WAVE_COUNT;
    uint8 public immutable WAVE_SIZE;
    uint16 public immutable TOTAL_ENEMIES; // WAVE_COUNT * WAVE_SIZE
    uint40 public immutable TIMEOUT_BLOCKS;

    uint8 public enemyTypesCount; // client maps [0..enemyTypesCount-1] -> image file

    // Redstone Price Feed Addresses
    AggregatorV3Interface internal ethPriceFeed;
    AggregatorV3Interface internal btcPriceFeed;
    AggregatorV3Interface internal pufEthPriceFeed;

    // Price feeds enabled flag
    bool public priceFeedsEnabled;

    // Planet NFT
    IPlanetNFT public planetNFT;

    // Betting constants
    uint256 public constant FEE_BPS = 2000; // 20%
    uint256 public constant BPS = 10000;

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

    // --- Daily defeats (from submitted results) ---
    // dayId => coinId => defeats
    mapping(uint256 => mapping(uint8 => uint256)) public dailyDefeats;

    // --- Betting state ---
    // dayId => total staked (all coins)
    mapping(uint256 => uint256) public totalStaked;
    // dayId => coinId => total staked on that coin
    mapping(uint256 => mapping(uint8 => uint256)) public stakedPerCoin;
    // dayId => user => coinId => stake
    mapping(uint256 => mapping(address => mapping(uint8 => uint256))) public userStakePerCoin;

    // Settlement
    mapping(uint256 => bool) public daySettled;
    mapping(uint256 => uint8) public dayWinningCoin;
    // Locked denominators and payout pool at settlement time
    mapping(uint256 => uint256) public dayWinnersStake; // sum of stakes on the winning coin
    mapping(uint256 => uint256) public dayPayoutPool; // totalStaked * (BPS - FEE_BPS) / BPS
    // Claims
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    // Events
    event GameCompleted(
        address indexed player,
        uint256 indexed planetId,
        uint256 indexed dayId,
        bytes32 seed,
        uint40 startBlock,
        uint40 endBlock,
        uint8[] counts,
        uint256 totalDefeats
    );

    constructor(
        address _planetNFT,
        uint8 _enemyTypesCount,
        uint8 _waveCount,
        uint8 _waveSize,
        uint40 _timeoutBlocks,
        address trustedForwarder
    ) Ownable() ERC2771Context(trustedForwarder) {
        require(_enemyTypesCount > 0, "enemy types = 0");
        require(_planetNFT != address(0), "planet addr=0");
        planetNFT = IPlanetNFT(_planetNFT);

        enemyTypesCount = _enemyTypesCount;
        WAVE_COUNT = _waveCount;
        WAVE_SIZE = _waveSize;
        TOTAL_ENEMIES = uint16(uint256(_waveCount) * uint256(_waveSize));
        TIMEOUT_BLOCKS = _timeoutBlocks;

        // Initialize Redstone price feeds (only if addresses are valid)
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

    function setPriceFeeds(address _ethPriceFeed, address _btcPriceFeed, address _pufEthPriceFeed) external onlyOwner {
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
            return (2000 * 10 ** 8, 40000 * 10 ** 8, 1800 * 10 ** 8); // Mock prices in 8 decimal format
        }

        try ethPriceFeed.latestRoundData() returns (uint80, int256 _ethPrice, uint256, uint256, uint80) {
            ethPrice = _ethPrice;
        } catch {
            ethPrice = 2000 * 10 ** 8; // Fallback ETH price
        }

        try btcPriceFeed.latestRoundData() returns (uint80, int256 _btcPrice, uint256, uint256, uint80) {
            btcPrice = _btcPrice;
        } catch {
            btcPrice = 40000 * 10 ** 8; // Fallback BTC price
        }

        try pufEthPriceFeed.latestRoundData() returns (uint80, int256 _pufEthPrice, uint256, uint256, uint80) {
            pufEthPrice = _pufEthPrice;
        } catch {
            pufEthPrice = 1800 * 10 ** 8; // Fallback pufETH price
        }
    }

    function generateFunRandomness() internal view returns (bytes32) {
        // Get latest prices from Redstone oracle
        (int256 ethPrice, int256 btcPrice, int256 pufEthPrice) = getLatestPrices();

        // Combine multiple sources of (not)randomness to create one:
        // 1. Previous block hash
        // 2. Current block's prevrandao
        // 3. Player address
        // 4. Nonce
        // 5. ETH price
        // 6. BTC price
        // 7. pufETH price
        // 8. Block timestamp
        return
            keccak256(
                abi.encodePacked(
                    blockhash(block.number - 1),
                    block.prevrandao,
                    _msgSender(),
                    _nonce,
                    ethPrice,
                    btcPrice,
                    pufEthPrice,
                    block.timestamp
                )
            );
    }

    // --- Session lifecycle ---

    function hasActiveSession(address player) public view returns (bool) {
        Session memory s = _activeSession[player];
        if (!s.exists) return false;
        if (block.number > s.startBlock + TIMEOUT_BLOCKS) return false;
        return true;
    }

    function getActiveSession(
        address player
    ) external view returns (bytes32 seed, uint40 startBlock, uint40 deadline, bool active) {
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
        // Require a PlanetNFT to play
        require(planetNFT.ownedPlanet(_msgSender()) != 0, "need planet");
        // Enforce one active session; allow restart if expired
        Session memory s = _activeSession[_msgSender()];
        if (s.exists) {
            require(block.number > s.startBlock + TIMEOUT_BLOCKS, "active session");
        }

        // Enhanced randomness using Redstone price feeds + blockchain data
        _nonce++;
        bytes32 seed = generateFunRandomness();
        _activeSession[_msgSender()] = Session({ seed: seed, startBlock: uint40(block.number), exists: true });
    }

    // Returns the full schedule (150 uint8 IDs) for the caller's active session
    function getMySchedule() external view returns (uint8[] memory seq) {
        return getScheduleFor(_msgSender());
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
        Session memory s = _activeSession[_msgSender()];
        require(s.exists, "no session");
        require(block.number <= s.startBlock + TIMEOUT_BLOCKS, "session expired");
        require(counts.length == enemyTypesCount, "bad length");

        // Store the play
        uint8[] memory copy = new uint8[](counts.length);
        for (uint256 i = 0; i < counts.length; i++) {
            copy[i] = counts[i];
        }
        _plays[_msgSender()].push(
            Play({ seed: s.seed, startBlock: s.startBlock, endBlock: uint40(block.number), counts: copy })
        );

        // Update daily defeats tallies and persist to NFT attributes
        uint256 dayId = block.timestamp / 1 days;
        uint256 totalDefeats = 0;
        for (uint256 i = 0; i < counts.length; i++) {
            dailyDefeats[dayId][uint8(i)] += counts[i];
            totalDefeats += counts[i];
        }
        uint256 tokenId = planetNFT.ownedPlanet(_msgSender());
        // tokenId must be non-zero since we require it in startGame
        planetNFT.recordGameResult(tokenId, dayId, counts);

        // Emit game completion event
        emit GameCompleted(
            _msgSender(),
            tokenId,
            dayId,
            s.seed,
            s.startBlock,
            uint40(block.number),
            counts,
            totalDefeats
        );

        delete _activeSession[_msgSender()];
    }

    // --- History ---

    function getPlaysCount(address player) external view returns (uint256) {
        return _plays[player].length;
    }

    function getPlay(
        address player,
        uint256 index
    ) external view returns (bytes32 seed, uint40 startBlock, uint40 endBlock, uint8[] memory counts) {
        Play storage p = _plays[player][index];
        return (p.seed, p.startBlock, p.endBlock, p.counts);
    }

    // --- Betting ---

    function placeBet(uint8 coinId) external payable {
        require(msg.value > 0, "no value");
        require(coinId < enemyTypesCount, "bad coin");
        uint256 dayId = block.timestamp / 1 days;
        require(!daySettled[dayId], "day settled");

        totalStaked[dayId] += msg.value;
        stakedPerCoin[dayId][coinId] += msg.value;
        userStakePerCoin[dayId][_msgSender()][coinId] += msg.value;
    }

    function settleDay(uint256 dayId) external onlyOwner {
        require(!daySettled[dayId], "already settled");

        // Compute winning coin (most defeats) with deterministic tie-breaker (lowest coinId)
        uint8 winning = 0;
        uint256 maxDefeats = 0;
        uint256 totalDefeatsSum = 0;
        for (uint8 i = 0; i < enemyTypesCount; i++) {
            uint256 d = dailyDefeats[dayId][i];
            totalDefeatsSum += d;
            if (d > maxDefeats) {
                maxDefeats = d;
                winning = i;
            }
        }
        require(totalDefeatsSum > 0, "no defeats");

        daySettled[dayId] = true;
        dayWinningCoin[dayId] = winning;

        uint256 winnersStake = stakedPerCoin[dayId][winning];
        dayWinnersStake[dayId] = winnersStake;

        if (winnersStake == 0) {
            // No winners; per spec funds remain in contract (treasury)
            dayPayoutPool[dayId] = 0;
        } else {
            uint256 pool = totalStaked[dayId];
            uint256 payout = (pool * (BPS - FEE_BPS)) / BPS; // 80% to winners
            dayPayoutPool[dayId] = payout;
        }
    }

    function claim(uint256 dayId) external {
        require(daySettled[dayId], "not settled");
        require(!hasClaimed[dayId][_msgSender()], "claimed");

        uint8 winning = dayWinningCoin[dayId];
        uint256 winnersStake = dayWinnersStake[dayId];
        require(winnersStake > 0, "no winners");

        uint256 userStake = userStakePerCoin[dayId][_msgSender()][winning];
        require(userStake > 0, "no stake");

        uint256 payoutPool = dayPayoutPool[dayId];
        uint256 amount = (payoutPool * userStake) / winnersStake;

        hasClaimed[dayId][_msgSender()] = true;

        (bool ok, ) = payable(_msgSender()).call{ value: amount }("");
        require(ok, "transfer failed");
    }

    // --- Views for UI ---

    function getDayInfo(
        uint256 dayId
    )
        external
        view
        returns (
            bool settled,
            uint8 winningCoin,
            uint256 totalPool,
            uint256[] memory stakesPerCoin,
            uint256[] memory defeatsPerCoin
        )
    {
        settled = daySettled[dayId];
        winningCoin = dayWinningCoin[dayId];
        totalPool = totalStaked[dayId];

        stakesPerCoin = new uint256[](enemyTypesCount);
        defeatsPerCoin = new uint256[](enemyTypesCount);
        for (uint8 i = 0; i < enemyTypesCount; i++) {
            stakesPerCoin[i] = stakedPerCoin[dayId][i];
            defeatsPerCoin[i] = dailyDefeats[dayId][i];
        }
    }

    function getUserStake(uint256 dayId, address user) external view returns (uint256[] memory stakesPerCoin) {
        stakesPerCoin = new uint256[](enemyTypesCount);
        for (uint8 i = 0; i < enemyTypesCount; i++) {
            stakesPerCoin[i] = userStakePerCoin[dayId][user][i];
        }
    }

    function feeBasisPoints() external pure returns (uint256) {
        return FEE_BPS;
    }

    // --- ERC2771 overrides ---
    function _msgSender() internal view override(Context, ERC2771Context) returns (address sender) {
        return ERC2771Context._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Context) returns (bytes calldata) {
        return ERC2771Context._msgData();
    }

    function _contextSuffixLength() internal view override(Context, ERC2771Context) returns (uint256) {
        return ERC2771Context._contextSuffixLength();
    }
}
