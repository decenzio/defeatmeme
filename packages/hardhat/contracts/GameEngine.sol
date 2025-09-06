// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract GameEngine is Ownable {
    uint8 public immutable WAVE_COUNT;
    uint8 public immutable WAVE_SIZE;
    uint16 public immutable TOTAL_ENEMIES; // WAVE_COUNT * WAVE_SIZE
    uint40 public immutable TIMEOUT_BLOCKS;

    uint8 public enemyTypesCount; // client maps [0..enemyTypesCount-1] -> image file

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
    }

    // --- Admin ---

    function setEnemyTypesCount(uint8 newCount) external onlyOwner {
        require(newCount > 0, "enemy types = 0");
        enemyTypesCount = newCount;
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

        // Local randomness (fallback). Replace with RedStone VRF in future.
        bytes32 seed = keccak256(abi.encodePacked(blockhash(block.number - 1), msg.sender, block.prevrandao, _nonce++));
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