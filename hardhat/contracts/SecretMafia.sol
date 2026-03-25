// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    FHE,
    euint8,
    euint32,
    ebool,
    InEuint32
} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract SecretMafia {

    // ═══════════════════════════════════════
    // ENUMS
    // ═══════════════════════════════════════

    enum GameState {
        WAITING,
        ACTIVE,
        ENDED
    }

    enum Phase {
        NIGHT,
        DAY
    }

    enum Role {
        NONE,
        MAFIA,
        VILLAGER
    }

    // ═══════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════

    struct Game {
        uint256 id;
        address creator;
        GameState state;
        Phase phase;

        address[] players;

        euint32 entropy;

        uint256 round;
        uint256 aliveCount;
    }

    struct NightAction {
        euint32 target;
        bool submitted;
    }

    // ═══════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════

    uint256 public gameCount;

    mapping(uint256 => Game) public games;
    mapping(uint256 => mapping(address => uint256)) public playerIndex;

    mapping(uint256 => mapping(address => euint8)) internal roles;
    mapping(uint256 => mapping(address => ebool)) internal alive;

    mapping(uint256 => mapping(address => NightAction)) internal nightActions;

    mapping(uint256 => mapping(uint256 => euint32)) internal votes;

    mapping(uint256 => mapping(address => string)) public playerNames;

    // ═══════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════

    event GameCreated(uint256 gameId);
    event PlayerJoined(uint256 gameId, address player);
    event GameStarted(uint256 gameId);
    event NightResolved(uint256 gameId);
    event VoteResolved(uint256 gameId);
    event GameEnded(uint256 gameId);

    // ═══════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════

    error NotCreator();
    error InvalidState();
    error AlreadyJoined();
    error NotJoined();
    error DecryptionNotReady();

    // ═══════════════════════════════════════
    // INTERNAL HELPERS
    // ═══════════════════════════════════════

    function _getUint32(euint32 val) internal view returns (uint32) {
        (uint32 v, bool ready) = FHE.getDecryptResultSafe(val);
        if (!ready) revert DecryptionNotReady();
        return v;
    }

    // ═══════════════════════════════════════
    // CREATE GAME
    // ═══════════════════════════════════════

    function createGame(
        string calldata name,
        string calldata creatorName,
        InEuint32 calldata entropy
    ) external returns (uint256 gameId) {
        gameId = gameCount++;

        Game storage g = games[gameId];
        g.id = gameId;
        g.creator = msg.sender;
        g.state = GameState.WAITING;
        g.phase = Phase.NIGHT;
        g.entropy = FHE.asEuint32(entropy);
        g.round = 1;

        FHE.allowThis(g.entropy);

        g.players.push(msg.sender);
        playerIndex[gameId][msg.sender] = 1;
        playerNames[gameId][msg.sender] = creatorName;

        emit GameCreated(gameId);
        emit PlayerJoined(gameId, msg.sender);
    }

    // ═══════════════════════════════════════
    // JOIN GAME
    // ═══════════════════════════════════════

    function joinGame(
        uint256 gameId,
        string calldata name,
        InEuint32 calldata entropy
    ) external {
        Game storage g = games[gameId];

        if (g.state != GameState.WAITING) revert InvalidState();
        if (playerIndex[gameId][msg.sender] != 0) revert AlreadyJoined();

        g.players.push(msg.sender);
        playerIndex[gameId][msg.sender] = g.players.length;
        playerNames[gameId][msg.sender] = name;

        g.entropy = FHE.xor(g.entropy, FHE.asEuint32(entropy));
        FHE.allowThis(g.entropy);

        emit PlayerJoined(gameId, msg.sender);
    }

    // ═══════════════════════════════════════
    // START GAME
    // ═══════════════════════════════════════

    function startGame(uint256 gameId) external {
        Game storage g = games[gameId];

        if (msg.sender != g.creator) revert NotCreator();
        if (g.state != GameState.WAITING) revert InvalidState();

        uint256 n = g.players.length;

        for (uint256 i = 0; i < n; i++) {
            address player = g.players[i];

            euint8 role = (i == 0)
                ? FHE.asEuint8(uint8(Role.MAFIA))
                : FHE.asEuint8(uint8(Role.VILLAGER));

            roles[gameId][player] = role;
            FHE.allow(role, player);

            alive[gameId][player] = FHE.asEbool(true);
            FHE.allowThis(alive[gameId][player]);
        }

        g.aliveCount = n;
        g.state = GameState.ACTIVE;

        emit GameStarted(gameId);
    }

    // ═══════════════════════════════════════
    // NIGHT ACTION
    // ═══════════════════════════════════════

    function submitNightAction(
        uint256 gameId,
        InEuint32 calldata target
    ) external {
        Game storage g = games[gameId];

        if (g.phase != Phase.NIGHT) revert InvalidState();
        if (playerIndex[gameId][msg.sender] == 0) revert NotJoined();

        euint32 encTarget = FHE.asEuint32(target);
        FHE.allowThis(encTarget);

        nightActions[gameId][msg.sender] = NightAction({
            target: encTarget,
            submitted: true
        });

        // request decryption
        FHE.decrypt(encTarget);
    }

    // ═══════════════════════════════════════
    // RESOLVE NIGHT
    // ═══════════════════════════════════════

    function resolveNight(uint256 gameId) external {
        Game storage g = games[gameId];

        if (g.phase != Phase.NIGHT) revert InvalidState();

        uint256 n = g.players.length;

        for (uint256 i = 0; i < n; i++) {
            address player = g.players[i];

            NightAction storage action = nightActions[gameId][player];
            if (!action.submitted) continue;

            uint32 targetIndex = _getUint32(action.target);
            address target = g.players[targetIndex % n];

            alive[gameId][target] = FHE.asEbool(false);
            g.aliveCount--;
        }

        g.phase = Phase.DAY;

        emit NightResolved(gameId);
    }

    // ═══════════════════════════════════════
    // VOTING
    // ═══════════════════════════════════════

    function vote(
        uint256 gameId,
        InEuint32 calldata target
    ) external {
        Game storage g = games[gameId];

        if (g.phase != Phase.DAY) revert InvalidState();

        uint256 idx = playerIndex[gameId][msg.sender];

        euint32 encVote = FHE.asEuint32(target);
        FHE.allowThis(encVote);

        votes[gameId][idx] = encVote;

        // request decrypt
        FHE.decrypt(encVote);
    }

    // ═══════════════════════════════════════
    // RESOLVE VOTE
    // ═══════════════════════════════════════

    function resolveVote(uint256 gameId) external {
        Game storage g = games[gameId];

        if (g.phase != Phase.DAY) revert InvalidState();

        uint32 targetIndex = _getUint32(votes[gameId][1]);
        address target = g.players[targetIndex % g.players.length];

        alive[gameId][target] = FHE.asEbool(false);
        g.aliveCount--;

        if (g.aliveCount <= 2) {
            g.state = GameState.ENDED;
            emit GameEnded(gameId);
        } else {
            g.phase = Phase.NIGHT;
            g.round++;
        }

        emit VoteResolved(gameId);
    }

    // ═══════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════

    function getMyRole(uint256 gameId) external view returns (euint8) {
        return roles[gameId][msg.sender];
    }

    function isAlivePlayer(uint256 gameId, address player) external view returns (ebool) {
        return alive[gameId][player];
    }

    function getPlayers(uint256 gameId) external view returns (address[] memory) {
        return games[gameId].players;
    }

    function getGame(uint256 gameId)
        external
        view
        returns (GameState, Phase, uint256, uint256)
    {
        Game storage g = games[gameId];
        return (g.state, g.phase, g.round, g.aliveCount);
    }
}