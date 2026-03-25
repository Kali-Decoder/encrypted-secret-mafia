"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { useCofheStore } from "@/services/store/cofheStore";
import { useSecretSantaStore } from "@/services/store/secretSantaStore";
import {
  CONTRACT_ADDRESS,
  SECRET_SANTA_ABI,
  generateEntropy,
} from "@/utils/secretSantaContract";
import { loadCofheWeb } from "@/utils/cofheWeb";

// ═══════════════════════════════════════════════════════════════════════════
// Types & Enums
// ═══════════════════════════════════════════════════════════════════════════

export enum GameState {
  WAITING = 0,
  ACTIVE = 1,
  ENDED = 2,
}

export enum Phase {
  NIGHT = 0,
  DAY = 1,
}

export const gameStateLabels: Record<GameState, string> = {
  [GameState.WAITING]: "Waiting ⏳",
  [GameState.ACTIVE]: "Active ✅",
  [GameState.ENDED]: "Ended 🏁",
};

export const phaseLabels: Record<Phase, string> = {
  [Phase.NIGHT]: "Night 🌙",
  [Phase.DAY]: "Day ☀️",
};

export interface GameInfo {
  gameId: bigint;
  creator: `0x${string}`;
  name: string;
  state: GameState;
  phase: Phase;
  round: bigint;
  aliveCount: bigint;
  playerCount: bigint;
}

export interface ParticipantWithName {
  address: `0x${string}`;
  name: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function parseError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  const patterns = [
    /User rejected the request/i,
    /user rejected/i,
    /rejected by user/i,
    /reverted with reason string ['"](.+?)['"]/i,
    /execution reverted: (.+?)(?:\n|$)/i,
    /reason: (.+?)(?:\n|$)/i,
    /AlreadyJoined/i,
    /NotCreator/i,
    /InvalidState/i,
    /NotJoined/i,
    /DecryptionNotReady/i,
    /insufficient funds/i,
    /network error/i,
    /could not connect/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const result = match[1] || match[0];
      return result.charAt(0).toUpperCase() + result.slice(1);
    }
  }

  if (message.length > 100) {
    return "Transaction failed. Please try again.";
  }

  return message;
}

async function encryptUint32Web(value: bigint) {
  const mod = await loadCofheWeb();
  if (!mod) {
    throw new Error("CoFHE not available in this environment");
  }
  const result = await mod.cofhejs.encrypt([mod.Encryptable.uint32(value)]);
  if (!result.success) {
    throw new Error(result.error?.message || "Encryption failed");
  }
  return result.data;
}

async function unsealUint8(value: bigint) {
  const mod = await loadCofheWeb();
  if (!mod) {
    throw new Error("CoFHE not available in this environment");
  }
  const result = await mod.cofhejs.unseal(value, mod.FheTypes.Uint8);
  return result as number;
}

async function unsealBool(value: bigint) {
  const mod = await loadCofheWeb();
  if (!mod) {
    throw new Error("CoFHE not available in this environment");
  }
  const result = await mod.cofhejs.unseal(value, mod.FheTypes.Bool);
  return Boolean(result);
}

export function useContractAddress(): `0x${string}` | undefined {
  const { chain } = useAccount();
  if (chain?.id === 421614) {
    return CONTRACT_ADDRESS;
  }
  return undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// Hooks
// ═══════════════════════════════════════════════════════════════════════════

export function useGameInfo(gameId: bigint | null) {
  const publicClient = usePublicClient();
  const contractAddress = useContractAddress();
  const storedGames = useSecretSantaStore((s) => s.games);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGameInfo = useCallback(async () => {
    if (!publicClient || !contractAddress || gameId === null) return null;

    setIsLoading(true);
    setError(null);

    try {
      const [gameStructRaw, gameStatus, players] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: SECRET_SANTA_ABI,
          functionName: "games",
          args: [gameId],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: SECRET_SANTA_ABI,
          functionName: "getGame",
          args: [gameId],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: SECRET_SANTA_ABI,
          functionName: "getPlayers",
          args: [gameId],
        }),
      ]);

      const stored = storedGames.find((g) => g.gameId === gameId.toString());
      const name = stored?.name ?? `Game #${gameId.toString()}`;

      const gameStruct = gameStructRaw as readonly [
        bigint,
        `0x${string}`,
        number,
        number,
        bigint,
        bigint,
        bigint
      ];

      const info: GameInfo = {
        gameId,
        creator: gameStruct[1],
        name,
        state: Number(gameStatus[0]) as GameState,
        phase: Number(gameStatus[1]) as Phase,
        round: gameStatus[2],
        aliveCount: gameStatus[3],
        playerCount: BigInt(players.length),
      };

      setGameInfo(info);
      return info;
    } catch (err) {
      setError(parseError(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, contractAddress, gameId, storedGames]);

  return { gameInfo, isLoading, error, fetchGameInfo };
}

export function useMyGames() {
  const publicClient = usePublicClient();
  const contractAddress = useContractAddress();
  const { chain } = useAccount();
  const storedGames = useSecretSantaStore((s) => s.games);

  const [games, setGames] = useState<GameInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyGames = useCallback(async () => {
    if (!publicClient || !contractAddress || !chain) return [];

    setIsLoading(true);
    setError(null);

    try {
      const chainGames = storedGames.filter((g) => g.chainId === chain.id);
      const results: GameInfo[] = [];

      for (const g of chainGames) {
        try {
          const gameId = BigInt(g.gameId);
          const [gameStructRaw, gameStatus, players] = await Promise.all([
            publicClient.readContract({
              address: contractAddress,
              abi: SECRET_SANTA_ABI,
              functionName: "games",
              args: [gameId],
            }),
            publicClient.readContract({
              address: contractAddress,
              abi: SECRET_SANTA_ABI,
              functionName: "getGame",
              args: [gameId],
            }),
            publicClient.readContract({
              address: contractAddress,
              abi: SECRET_SANTA_ABI,
              functionName: "getPlayers",
              args: [gameId],
            }),
          ]);

          const gameStruct = gameStructRaw as readonly [
            bigint,
            `0x${string}`,
            number,
            number,
            bigint,
            bigint,
            bigint
          ];

          results.push({
            gameId,
            creator: gameStruct[1],
            name: g.name || `Game #${g.gameId}`,
            state: Number(gameStatus[0]) as GameState,
            phase: Number(gameStatus[1]) as Phase,
            round: gameStatus[2],
            aliveCount: gameStatus[3],
            playerCount: BigInt(players.length),
          });
        } catch {
          // Ignore missing games
        }
      }

      setGames(results);
      return results;
    } catch (err) {
      setError(parseError(err));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, contractAddress, chain, storedGames]);

  return { games, isLoading, error, fetchMyGames };
}

export function useActiveGames() {
  const publicClient = usePublicClient();
  const contractAddress = useContractAddress();
  const storedGames = useSecretSantaStore((s) => s.games);

  const [games, setGames] = useState<GameInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveGames = useCallback(async () => {
    if (!publicClient || !contractAddress) return [];

    setIsLoading(true);
    setError(null);

    try {
      const gameCount = await publicClient.readContract({
        address: contractAddress,
        abi: SECRET_SANTA_ABI,
        functionName: "gameCount",
      });

      const total = Number(gameCount);
      const ids = Array.from({ length: total }, (_, i) => BigInt(i));

      const results = await Promise.all(
        ids.map(async (gameId) => {
          const [gameStructRaw, gameStatus, players] = await Promise.all([
            publicClient.readContract({
              address: contractAddress,
              abi: SECRET_SANTA_ABI,
              functionName: "games",
              args: [gameId],
            }),
            publicClient.readContract({
              address: contractAddress,
              abi: SECRET_SANTA_ABI,
              functionName: "getGame",
              args: [gameId],
            }),
            publicClient.readContract({
              address: contractAddress,
              abi: SECRET_SANTA_ABI,
              functionName: "getPlayers",
              args: [gameId],
            }),
          ]);

          const gameStruct = gameStructRaw as readonly [
            bigint,
            `0x${string}`,
            number,
            number,
            bigint,
            bigint,
            bigint
          ];

          const stored = storedGames.find((g) => g.gameId === gameId.toString());
          const name = stored?.name ?? `Game #${gameId.toString()}`;

          return {
            gameId,
            creator: gameStruct[1],
            name,
            state: Number(gameStatus[0]) as GameState,
            phase: Number(gameStatus[1]) as Phase,
            round: gameStatus[2],
            aliveCount: gameStatus[3],
            playerCount: BigInt(players.length),
          } as GameInfo;
        })
      );

      const active = results.filter((g) => g.state === GameState.WAITING);
      setGames(active);
      return active;
    } catch (err) {
      setError(parseError(err));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, contractAddress, storedGames]);

  return { games, isLoading, error, fetchActiveGames };
}

export function useAllGames() {
  const publicClient = usePublicClient();
  const contractAddress = useContractAddress();
  const storedGames = useSecretSantaStore((s) => s.games);

  const [games, setGames] = useState<GameInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllGames = useCallback(async () => {
    if (!publicClient || !contractAddress) return [];

    setIsLoading(true);
    setError(null);

    try {
      const gameCount = await publicClient.readContract({
        address: contractAddress,
        abi: SECRET_SANTA_ABI,
        functionName: "gameCount",
      });

      const total = Number(gameCount);
      const ids = Array.from({ length: total }, (_, i) => BigInt(i));

      const results = await Promise.all(
        ids.map(async (gameId) => {
          const [gameStructRaw, gameStatus, players] = await Promise.all([
            publicClient.readContract({
              address: contractAddress,
              abi: SECRET_SANTA_ABI,
              functionName: "games",
              args: [gameId],
            }),
            publicClient.readContract({
              address: contractAddress,
              abi: SECRET_SANTA_ABI,
              functionName: "getGame",
              args: [gameId],
            }),
            publicClient.readContract({
              address: contractAddress,
              abi: SECRET_SANTA_ABI,
              functionName: "getPlayers",
              args: [gameId],
            }),
          ]);

          const gameStruct = gameStructRaw as readonly [
            bigint,
            `0x${string}`,
            number,
            number,
            bigint,
            bigint,
            bigint
          ];

          const stored = storedGames.find((g) => g.gameId === gameId.toString());
          const name = stored?.name ?? `Game #${gameId.toString()}`;

          return {
            gameId,
            creator: gameStruct[1],
            name,
            state: Number(gameStatus[0]) as GameState,
            phase: Number(gameStatus[1]) as Phase,
            round: gameStatus[2],
            aliveCount: gameStatus[3],
            playerCount: BigInt(players.length),
          } as GameInfo;
        })
      );

      setGames(results);
      return results;
    } catch (err) {
      setError(parseError(err));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, contractAddress, storedGames]);

  return { games, isLoading, error, fetchAllGames };
}

export function useCreateGame() {
  const publicClient = usePublicClient();
  const contractAddress = useContractAddress();
  const { address, chain } = useAccount();
  const { isInitialized } = useCofheStore();
  const { writeContractAsync } = useWriteContract();
  const { addGame } = useSecretSantaStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGame = useCallback(
    async (gameName: string, creatorName: string) => {
      if (!contractAddress || !address || !chain || !publicClient) return null;
      if (!isInitialized) {
        setError("FHE not initialized");
        return null;
      }

      setIsLoading(true);
      setIsSuccess(false);
      setError(null);

      try {
        const entropy = generateEntropy();
        const encrypted = await encryptUint32Web(entropy);

        const hash = await writeContractAsync({
          address: contractAddress,
          abi: SECRET_SANTA_ABI,
          functionName: "createGame",
          args: [gameName, creatorName, encrypted[0]],
        });

        await publicClient.waitForTransactionReceipt({ hash });
        const gameCount = await publicClient.readContract({
          address: contractAddress,
          abi: SECRET_SANTA_ABI,
          functionName: "gameCount",
        });
        const newGameId = (gameCount as bigint) - 1n;

        addGame({
          gameId: newGameId.toString(),
          creator: address,
          name: gameName,
          createdAt: Date.now(),
          chainId: chain.id,
          joinedAt: Date.now(),
        });

        setIsSuccess(true);
        return hash;
      } catch (err) {
        setError(parseError(err));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [contractAddress, address, chain, publicClient, isInitialized, writeContractAsync, addGame]
  );

  return { createGame, isLoading, isSuccess, error };
}

export function useJoinGame() {
  const publicClient = usePublicClient();
  const contractAddress = useContractAddress();
  const { address, chain } = useAccount();
  const { isInitialized } = useCofheStore();
  const { writeContractAsync } = useWriteContract();
  const { addGame } = useSecretSantaStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinGame = useCallback(
    async (gameId: bigint, playerName: string) => {
      if (!contractAddress || !address || !chain || !publicClient) return null;
      if (!isInitialized) {
        setError("FHE not initialized");
        return null;
      }

      setIsLoading(true);
      setIsSuccess(false);
      setError(null);

      try {
        const entropy = generateEntropy();
        const encrypted = await encryptUint32Web(entropy);

        const hash = await writeContractAsync({
          address: contractAddress,
          abi: SECRET_SANTA_ABI,
          functionName: "joinGame",
          args: [gameId, playerName, encrypted[0]],
        });

        await publicClient.waitForTransactionReceipt({ hash });

        addGame({
          gameId: gameId.toString(),
          creator: address,
          name: `Game #${gameId.toString()}`,
          createdAt: Date.now(),
          chainId: chain.id,
          joinedAt: Date.now(),
        });

        setIsSuccess(true);
        return hash;
      } catch (err) {
        setError(parseError(err));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [contractAddress, address, chain, publicClient, isInitialized, writeContractAsync, addGame]
  );

  return { joinGame, isLoading, isSuccess, error };
}

export function useStartGame() {
  const contractAddress = useContractAddress();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startGame = useCallback(
    async (gameId: bigint) => {
      if (!contractAddress || !publicClient) return null;
      setIsLoading(true);
      setIsSuccess(false);
      setError(null);

      try {
        const hash = await writeContractAsync({
          address: contractAddress,
          abi: SECRET_SANTA_ABI,
          functionName: "startGame",
          args: [gameId],
        });
        await publicClient.waitForTransactionReceipt({ hash });
        setIsSuccess(true);
        return hash;
      } catch (err) {
        setError(parseError(err));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [contractAddress, publicClient, writeContractAsync]
  );

  return { startGame, isLoading, isSuccess, error };
}

export function useSubmitNightAction() {
  const contractAddress = useContractAddress();
  const publicClient = usePublicClient();
  const { isInitialized } = useCofheStore();
  const { writeContractAsync } = useWriteContract();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitNightAction = useCallback(
    async (gameId: bigint, targetIndex: number) => {
      if (!contractAddress || !publicClient) return null;
      if (!isInitialized) {
        setError("FHE not initialized");
        return null;
      }

      setIsLoading(true);
      setIsSuccess(false);
      setError(null);

      try {
        const encrypted = await encryptUint32Web(BigInt(targetIndex));

        const hash = await writeContractAsync({
          address: contractAddress,
          abi: SECRET_SANTA_ABI,
          functionName: "submitNightAction",
          args: [gameId, encrypted[0]],
        });
        await publicClient.waitForTransactionReceipt({ hash });

        setIsSuccess(true);
        return hash;
      } catch (err) {
        setError(parseError(err));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [contractAddress, publicClient, isInitialized, writeContractAsync]
  );

  return { submitNightAction, isLoading, isSuccess, error };
}

export function useVote() {
  const contractAddress = useContractAddress();
  const publicClient = usePublicClient();
  const { isInitialized } = useCofheStore();
  const { writeContractAsync } = useWriteContract();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vote = useCallback(
    async (gameId: bigint, targetIndex: number) => {
      if (!contractAddress || !publicClient) return null;
      if (!isInitialized) {
        setError("FHE not initialized");
        return null;
      }

      setIsLoading(true);
      setIsSuccess(false);
      setError(null);

      try {
        const encrypted = await encryptUint32Web(BigInt(targetIndex));

        const hash = await writeContractAsync({
          address: contractAddress,
          abi: SECRET_SANTA_ABI,
          functionName: "vote",
          args: [gameId, encrypted[0]],
        });
        await publicClient.waitForTransactionReceipt({ hash });

        setIsSuccess(true);
        return hash;
      } catch (err) {
        setError(parseError(err));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [contractAddress, publicClient, isInitialized, writeContractAsync]
  );

  return { vote, isLoading, isSuccess, error };
}

export function useResolveNight() {
  const contractAddress = useContractAddress();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveNight = useCallback(
    async (gameId: bigint) => {
      if (!contractAddress || !publicClient) return null;
      setIsLoading(true);
      setIsSuccess(false);
      setError(null);

      try {
        const hash = await writeContractAsync({
          address: contractAddress,
          abi: SECRET_SANTA_ABI,
          functionName: "resolveNight",
          args: [gameId],
        });
        await publicClient.waitForTransactionReceipt({ hash });
        setIsSuccess(true);
        return hash;
      } catch (err) {
        setError(parseError(err));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [contractAddress, publicClient, writeContractAsync]
  );

  return { resolveNight, isLoading, isSuccess, error };
}

export function useResolveVote() {
  const contractAddress = useContractAddress();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveVote = useCallback(
    async (gameId: bigint) => {
      if (!contractAddress || !publicClient) return null;
      setIsLoading(true);
      setIsSuccess(false);
      setError(null);

      try {
        const hash = await writeContractAsync({
          address: contractAddress,
          abi: SECRET_SANTA_ABI,
          functionName: "resolveVote",
          args: [gameId],
        });
        await publicClient.waitForTransactionReceipt({ hash });
        setIsSuccess(true);
        return hash;
      } catch (err) {
        setError(parseError(err));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [contractAddress, publicClient, writeContractAsync]
  );

  return { resolveVote, isLoading, isSuccess, error };
}

export function useParticipantsWithNames(gameId: bigint | null) {
  const publicClient = usePublicClient();
  const contractAddress = useContractAddress();
  const [participants, setParticipants] = useState<ParticipantWithName[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchParticipantsWithNames = useCallback(async () => {
    if (!publicClient || !contractAddress || gameId === null) return [];

    setIsLoading(true);
    setError(null);

    try {
      const players = await publicClient.readContract({
        address: contractAddress,
        abi: SECRET_SANTA_ABI,
        functionName: "getPlayers",
        args: [gameId],
      });

      const withNames = await Promise.all(
        players.map(async (addr: `0x${string}`) => {
          const name = await publicClient.readContract({
            address: contractAddress,
            abi: SECRET_SANTA_ABI,
            functionName: "playerNames",
            args: [gameId, addr],
          });
          return { address: addr, name: name as string };
        })
      );

      setParticipants(withNames);
      return withNames;
    } catch (err) {
      setError(parseError(err));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, contractAddress, gameId]);

  return { participants, isLoading, error, fetchParticipantsWithNames };
}

export function usePlayerName(gameId: bigint | null, playerAddress: `0x${string}` | null) {
  const publicClient = usePublicClient();
  const contractAddress = useContractAddress();
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayerName = useCallback(async () => {
    if (!publicClient || !contractAddress || gameId === null || !playerAddress) return null;

    try {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: SECRET_SANTA_ABI,
        functionName: "playerNames",
        args: [gameId, playerAddress],
      });
      setName(result as string);
      return result as string;
    } catch (err) {
      setError(parseError(err));
      return null;
    }
  }, [publicClient, contractAddress, gameId, playerAddress]);

  return { name, error, fetchPlayerName };
}

export function useIsRegistered(gameId: bigint | null) {
  const publicClient = usePublicClient();
  const contractAddress = useContractAddress();
  const { address } = useAccount();
  const [isRegistered, setIsRegistered] = useState(false);

  const checkRegistration = useCallback(async () => {
    if (!publicClient || !contractAddress || gameId === null || !address) return false;

    try {
      const idx = await publicClient.readContract({
        address: contractAddress,
        abi: SECRET_SANTA_ABI,
        functionName: "playerIndex",
        args: [gameId, address],
      });
      const registered = BigInt(idx) > 0n;
      setIsRegistered(registered);
      return registered;
    } catch {
      setIsRegistered(false);
      return false;
    }
  }, [publicClient, contractAddress, gameId, address]);

  return { isRegistered, checkRegistration };
}

export function useMyRole(gameId: bigint | null) {
  const publicClient = usePublicClient();
  const contractAddress = useContractAddress();
  const { address } = useAccount();
  const [role, setRole] = useState<number | null>(null);
  const [encryptedRole, setEncryptedRole] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyRole = useCallback(async () => {
    if (!publicClient || !contractAddress || gameId === null || !address) return null;

    setIsLoading(true);
    setError(null);

    try {
      const handle = await publicClient.readContract({
        address: contractAddress,
        abi: SECRET_SANTA_ABI,
        functionName: "getMyRole",
        args: [gameId],
        account: address,
      });
      setEncryptedRole(handle as bigint);
      return handle as bigint;
    } catch (err) {
      setError(parseError(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, contractAddress, gameId, address]);

  const unsealRole = useCallback(async () => {
    if (!encryptedRole) return null;
    setIsLoading(true);
    setError(null);
    try {
      const result = await unsealUint8(encryptedRole);
      setRole(result);
      return result;
    } catch (err) {
      setError(parseError(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [encryptedRole]);

  return { role, encryptedRole, isLoading, error, fetchMyRole, unsealRole };
}

export function useIsAlive(gameId: bigint | null, playerAddress: `0x${string}` | null) {
  const publicClient = usePublicClient();
  const contractAddress = useContractAddress();
  const [alive, setAlive] = useState<boolean | null>(null);
  const [encryptedAlive, setEncryptedAlive] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlive = useCallback(async () => {
    if (!publicClient || !contractAddress || gameId === null || !playerAddress) return null;

    setIsLoading(true);
    setError(null);

    try {
      const handle = await publicClient.readContract({
        address: contractAddress,
        abi: SECRET_SANTA_ABI,
        functionName: "isAlivePlayer",
        args: [gameId, playerAddress],
      });
      setEncryptedAlive(handle as bigint);
      return handle as bigint;
    } catch (err) {
      setError(parseError(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, contractAddress, gameId, playerAddress]);

  const unsealAlive = useCallback(async () => {
    if (!encryptedAlive) return null;
    setIsLoading(true);
    setError(null);
    try {
      const result = await unsealBool(encryptedAlive);
      setAlive(result);
      return result;
    } catch (err) {
      setError(parseError(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [encryptedAlive]);

  return { alive, encryptedAlive, isLoading, error, fetchAlive, unsealAlive };
}
