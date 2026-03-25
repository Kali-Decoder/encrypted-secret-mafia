"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, Loader2, Copy, CheckCircle2, Share2, ListChecks } from "lucide-react";
import {
  useGameInfo,
  GameState,
  Phase,
  gameStateLabels,
  phaseLabels,
  usePlayerName,
  useIsRegistered,
  useParticipantsWithNames,
} from "@/hooks/useSecretSanta";
import { ParticipantsList } from "./ParticipantsList";
import { TargetReveal } from "./TargetReveal";
import { GameActions } from "./GameActions";
import { PermitCard } from "./PermitCard";
import { useAccount } from "wagmi";

interface GameDetailsProps {
  gameId: bigint;
  onBack: () => void;
}

export const GameDetails = ({ gameId, onBack }: GameDetailsProps) => {
  const { address } = useAccount();
  const { gameInfo, isLoading, error, fetchGameInfo } = useGameInfo(gameId);
  const { isRegistered, checkRegistration } = useIsRegistered(gameId);
  const { participants, fetchParticipantsWithNames } = useParticipantsWithNames(gameId);
  const { name: creatorName, fetchPlayerName: fetchCreatorName } = usePlayerName(
    gameId,
    gameInfo?.creator ?? null
  );
  const [copied, setCopied] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchGameInfo();
  }, [fetchGameInfo]);

  useEffect(() => {
    if (gameInfo?.creator) {
      fetchCreatorName();
    }
  }, [gameInfo?.creator, fetchCreatorName]);

  useEffect(() => {
    if (gameId !== null) {
      checkRegistration();
    }
  }, [gameId, checkRegistration]);

  useEffect(() => {
    fetchParticipantsWithNames();
  }, [fetchParticipantsWithNames, refreshTrigger]);

  useEffect(() => {
    if (!gameInfo || gameInfo.state !== GameState.ACTIVE) return;
    const interval = setInterval(() => {
      fetchGameInfo();
      fetchParticipantsWithNames();
    }, 10000);
    return () => clearInterval(interval);
  }, [gameInfo, fetchGameInfo, fetchParticipantsWithNames]);

  const isCreator = address?.toLowerCase() === gameInfo?.creator.toLowerCase();
  const currentPhaseLabel = gameInfo ? phaseLabels[gameInfo.phase] : "—";

  const getStateStyles = () => {
    if (!gameInfo) return "text-santa-deepRed/60 bg-santa-deepRed/10";
    switch (gameInfo.state) {
      case GameState.WAITING:
        return "text-santa-deepRed bg-pastel-coral/30";
      case GameState.ACTIVE:
        return "text-santa-deepRed bg-pastel-mint/50";
      case GameState.ENDED:
        return "text-fhenix-purple bg-fhenix-purple/10";
      default:
        return "text-santa-deepRed/60 bg-santa-deepRed/10";
    }
  };

  const stepStatus = () => {
    if (!gameInfo) return 1;
    if (gameInfo.state === GameState.WAITING) return 1;
    if (gameInfo.state === GameState.ACTIVE && gameInfo.phase === Phase.NIGHT) return 3;
    if (gameInfo.state === GameState.ACTIVE && gameInfo.phase === Phase.DAY) return 4;
    return 5;
  };

  const activeStep = stepStatus();
  const nextStepText = () => {
    if (gameInfo.state === GameState.WAITING) {
      return isCreator
        ? "Share the Game ID and wait for players to join."
        : "Join with your name, then wait for the creator to start.";
    }
    if (gameInfo.state === GameState.ACTIVE && gameInfo.phase === Phase.NIGHT) {
      return isCreator
        ? "Wait for night actions, then resolve the night."
        : "Submit your night action.";
    }
    if (gameInfo.state === GameState.ACTIVE && gameInfo.phase === Phase.DAY) {
      return isCreator
        ? "Wait for votes, then resolve the vote."
        : "Submit your vote.";
    }
    return "Game ended. Start or join another game.";
  };

  const copyGameId = async () => {
    await navigator.clipboard.writeText(gameId.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading && !gameInfo) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 text-fhenix-purple animate-spin mx-auto mb-4" />
        <p className="text-white/60">Loading game details...</p>
      </div>
    );
  }

  if (error || !gameInfo) {
    return (
      <div className="py-20 text-center">
        <p className="text-pastel-coral mb-4">{error || "Game not found"}</p>
        <button onClick={onBack} className="text-white/70 hover:text-white flex items-center justify-center gap-2 mx-auto">
          <ArrowLeft className="w-4 h-4" />
          Back to Games
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-white/70 hover:text-white flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={() => fetchGameInfo()}
          disabled={isLoading}
          className="text-white/70 hover:text-white p-2 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="bg-white p-4 pb-8 rounded-sm shadow-polaroid transform rotate-1 hover:rotate-0 transition-transform duration-300">
        <div className="bg-pastel-cream rounded-sm p-5">
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-fhenix-purple/10 border border-fhenix-purple/20">
            <span className="text-xs font-semibold text-fhenix-purple">Phase</span>
            <span className="text-sm text-santa-deepRed">{currentPhaseLabel}</span>
          </div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-2xl font-bold font-display text-santa-deepRed">
                    {gameInfo.name}
                  </h2>
                </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-santa-deepRed/60">Status:</span>
                <span className={`text-sm font-medium px-2 py-0.5 rounded ${getStateStyles()}`}>
                  {gameStateLabels[gameInfo.state]}
                </span>
                <span className="text-xs text-santa-deepRed/60 ml-2">Phase:</span>
                <span className="text-sm font-medium px-2 py-0.5 rounded bg-white/70">
                  {currentPhaseLabel}
                </span>
              </div>
            </div>

            <button
              onClick={copyGameId}
              className="flex items-center gap-2 px-3 py-2 bg-white/50 border border-santa-deepRed/20 rounded-lg hover:border-fhenix-purple/50 transition-all"
              title="Copy Game ID"
            >
              <span className="text-xs text-santa-deepRed/60">ID:</span>
              <span className="font-mono text-santa-deepRed">{gameId.toString()}</span>
              {copied ? (
                <CheckCircle2 className="w-4 h-4 text-fhenix-purple" />
              ) : (
                <Copy className="w-4 h-4 text-santa-deepRed/40" />
              )}
            </button>
          </div>

          {gameInfo.state === GameState.WAITING && (
            <div className="p-3 bg-fhenix-purple/10 border border-fhenix-purple/30 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-fhenix-purple" />
                <span className="text-sm text-santa-deepRed">
                  Share Game ID <strong>{gameId.toString()}</strong> with friends to let them join!
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-white/50 rounded-lg">
              <p className="text-xs text-santa-deepRed/60 mb-1">Players</p>
              <p className="text-xl font-bold text-santa-deepRed">{gameInfo.playerCount.toString()}</p>
            </div>
            <div className="p-3 bg-white/50 rounded-lg">
              <p className="text-xs text-santa-deepRed/60 mb-1">Alive</p>
              <p className="text-xl font-bold text-santa-deepRed">{gameInfo.aliveCount.toString()}</p>
            </div>
            <div className="p-3 bg-white/50 rounded-lg">
              <p className="text-xs text-santa-deepRed/60 mb-1">Round</p>
              <p className="text-xl font-bold text-santa-deepRed">{gameInfo.round.toString()}</p>
            </div>
            <div className="p-3 bg-white/50 rounded-lg">
              <p className="text-xs text-santa-deepRed/60 mb-1">Creator</p>
              {creatorName ? (
                <div>
                  <p className="text-sm font-medium text-santa-deepRed">{creatorName}</p>
                  <p className="text-xs font-mono text-santa-deepRed/50 truncate">
                    {gameInfo.creator.slice(0, 10)}...{gameInfo.creator.slice(-8)}
                  </p>
                </div>
              ) : (
                <p className="text-sm font-mono text-santa-deepRed truncate">
                  {gameInfo.creator.slice(0, 10)}...{gameInfo.creator.slice(-8)}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 p-3 bg-white/70 border border-santa-deepRed/10 rounded-lg">
            <p className="text-xs text-santa-deepRed/60">Next step</p>
            <p className="text-sm text-santa-deepRed">{nextStepText()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white p-4 pb-8 rounded-sm shadow-polaroid transform -rotate-1 hover:rotate-0 transition-transform duration-300">
            <div className="bg-pastel-cream rounded-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="w-4 h-4 text-santa-deepRed" />
                <h4 className="text-sm font-bold font-display text-santa-deepRed">
                  Quick Steps
                </h4>
              </div>
              <div className="space-y-3 text-sm text-santa-deepRed/80">
                <div className={`p-3 rounded-lg ${activeStep === 1 ? "bg-pastel-mint/60 border border-pastel-mint" : "bg-white/60 border border-santa-deepRed/10"}`}>
                  <span className="font-semibold">1. Join</span> — players join with a name.
                </div>
                <div className={`p-3 rounded-lg ${activeStep === 2 ? "bg-pastel-mint/60 border border-pastel-mint" : "bg-white/60 border border-santa-deepRed/10"}`}>
                  <span className="font-semibold">2. Start</span> — creator starts the game.
                </div>
                <div className={`p-3 rounded-lg ${activeStep === 3 ? "bg-pastel-mint/60 border border-pastel-mint" : "bg-white/60 border border-santa-deepRed/10"}`}>
                  <span className="font-semibold">3. Night 🌙</span> — everyone submits a target, then creator resolves.
                </div>
                <div className={`p-3 rounded-lg ${activeStep === 4 ? "bg-pastel-mint/60 border border-pastel-mint" : "bg-white/60 border border-santa-deepRed/10"}`}>
                  <span className="font-semibold">4. Day ☀️</span> — everyone votes, then creator resolves.
                </div>
                <div className={`p-3 rounded-lg ${activeStep === 5 ? "bg-pastel-mint/60 border border-pastel-mint" : "bg-white/60 border border-santa-deepRed/10"}`}>
                  <span className="font-semibold">5. Repeat</span> — night/day cycles until the game ends.
                </div>
              </div>
              {gameInfo.state === GameState.WAITING && (
                <p className="mt-4 text-xs text-santa-deepRed/60">
                  Waiting for players. Share the game ID above.
                </p>
              )}
              {gameInfo.state === GameState.ACTIVE && (
                <p className="mt-4 text-xs text-santa-deepRed/60">
                  Current phase: {currentPhaseLabel}. Follow the highlighted step.
                </p>
              )}
            </div>
          </div>

          <ParticipantsList gameId={gameId} creatorAddress={gameInfo.creator} />

          <GameActions
            gameId={gameId}
            gameState={gameInfo.state}
            phase={gameInfo.phase}
            isCreator={isCreator}
            participants={participants}
            onActionComplete={() => {
              fetchGameInfo();
              setRefreshTrigger((t) => t + 1);
            }}
          />

          {isRegistered && <PermitCard />}
        </div>

        <div>
          {isRegistered && gameInfo.state >= GameState.ACTIVE ? (
            <TargetReveal gameId={gameId} refreshTrigger={refreshTrigger} />
          ) : (
            <div className="bg-white p-4 pb-8 rounded-sm shadow-polaroid transform rotate-2 hover:rotate-0 transition-transform duration-300">
              <div className="bg-pastel-cream rounded-sm p-5 text-center">
                <p className="text-santa-deepRed/70">
                  Join the game and wait for it to start to see your role.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
