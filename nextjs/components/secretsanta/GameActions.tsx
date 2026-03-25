"use client";

import { useState } from "react";
import { Loader2, Play, AlertCircle, CheckCircle2, Moon, Sun, Gavel, ShieldCheck } from "lucide-react";
import {
  useStartGame,
  useSubmitNightAction,
  useResolveNight,
  useVote,
  useResolveVote,
  GameState,
  Phase,
  ParticipantWithName,
} from "@/hooks/useSecretSanta";

interface GameActionsProps {
  gameId: bigint;
  gameState: GameState;
  phase: Phase;
  isCreator: boolean;
  participants: ParticipantWithName[];
  onActionComplete?: () => void;
}

export const GameActions = ({
  gameId,
  gameState,
  phase,
  isCreator,
  participants,
  onActionComplete,
}: GameActionsProps) => {
  const [nightTarget, setNightTarget] = useState("");
  const [voteTarget, setVoteTarget] = useState("");
  const [nightReady, setNightReady] = useState(false);
  const [voteReady, setVoteReady] = useState(false);

  const {
    startGame,
    isLoading: isStarting,
    isSuccess: startSuccess,
    error: startError,
  } = useStartGame();

  const {
    submitNightAction,
    isLoading: isSubmittingNight,
    isSuccess: nightSuccess,
    error: nightError,
  } = useSubmitNightAction();

  const {
    resolveNight,
    isLoading: isResolvingNight,
    isSuccess: resolveNightSuccess,
    error: resolveNightError,
  } = useResolveNight();

  const {
    vote,
    isLoading: isVoting,
    isSuccess: voteSuccess,
    error: voteError,
  } = useVote();

  const {
    resolveVote,
    isLoading: isResolvingVote,
    isSuccess: resolveVoteSuccess,
    error: resolveVoteError,
  } = useResolveVote();

  const handleStart = async () => {
    const hash = await startGame(gameId);
    if (hash) onActionComplete?.();
  };

  const handleSubmitNight = async () => {
    if (nightTarget === "") return;
    const hash = await submitNightAction(gameId, Number(nightTarget));
    if (hash) onActionComplete?.();
  };

  const handleResolveNight = async () => {
    const hash = await resolveNight(gameId);
    if (hash) onActionComplete?.();
  };

  const handleVote = async () => {
    if (voteTarget === "") return;
    const hash = await vote(gameId, Number(voteTarget));
    if (hash) onActionComplete?.();
  };

  const handleResolveVote = async () => {
    const hash = await resolveVote(gameId);
    if (hash) onActionComplete?.();
  };

  return (
    <div className="bg-white p-4 pb-8 rounded-sm shadow-polaroid transform rotate-1 hover:rotate-0 transition-transform duration-300">
      <div className="bg-pastel-pink rounded-sm p-5 space-y-4">
        <h4 className="text-sm font-bold font-display text-santa-deepRed">
          Actions (Current Phase)
        </h4>

        {gameState === GameState.WAITING && isCreator && (
          <div className="space-y-2">
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="btn-fhenix w-full h-11 flex items-center justify-center gap-2"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Game
                </>
              )}
            </button>
            {startError && (
              <p className="text-xs text-santa-deepRed flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {startError}
              </p>
            )}
            {startSuccess && (
              <p className="text-xs text-fhenix-purple flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Game started.
              </p>
            )}
          </div>
        )}

        {gameState === GameState.ACTIVE && phase === Phase.NIGHT && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-santa-deepRed" />
              <span className="text-xs text-santa-deepRed/70">Night Action • Encrypted</span>
            </div>
            <select
              value={nightTarget}
              onChange={(e) => setNightTarget(e.target.value)}
              className="input w-full bg-white border border-santa-deepRed/20 focus:border-fhenix-purple rounded-lg text-santa-deepRed"
            >
              <option value="">Select target</option>
              {participants.map((p, index) => (
                <option key={p.address} value={index}>
                  {index}. {p.name ? p.name : p.address.slice(0, 6) + "..." + p.address.slice(-4)}
                </option>
              ))}
            </select>
            <button
              onClick={handleSubmitNight}
              disabled={isSubmittingNight || nightTarget === ""}
              className="btn-fhenix w-full h-11 flex items-center justify-center gap-2"
            >
              {isSubmittingNight ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4" />
                  Submit Night Action 🌙
                </>
              )}
            </button>
            <label className="flex items-center gap-2 text-xs text-santa-deepRed/70">
              <input
                type="checkbox"
                checked={nightReady}
                onChange={(e) => setNightReady(e.target.checked)}
              />
              All night actions submitted
            </label>
            {isCreator ? (
              nightReady ? (
                <button
                  onClick={handleResolveNight}
                  disabled={isResolvingNight}
                  className="btn-santa w-full h-11 flex items-center justify-center gap-2"
                >
                  {isResolvingNight ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    <>
                      <Sun className="w-4 h-4" />
                      Resolve Night
                    </>
                  )}
                </button>
              ) : (
                <div className="p-3 bg-white/60 border border-santa-deepRed/20 rounded-lg text-xs text-santa-deepRed/70 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-santa-deepRed/60" />
                  Confirm all night actions are submitted to enable resolve.
                </div>
              )
            ) : (
              <div className="p-3 bg-white/60 border border-santa-deepRed/20 rounded-lg text-xs text-santa-deepRed/70 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-santa-deepRed/60" />
                Only the creator can resolve the night.
              </div>
            )}
            {(nightError || resolveNightError) && (
              <p className="text-xs text-santa-deepRed flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {nightError || resolveNightError}
              </p>
            )}
            {(nightSuccess || resolveNightSuccess) && (
              <p className="text-xs text-fhenix-purple flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Night action submitted/resolved.
              </p>
            )}
          </div>
        )}

        {gameState === GameState.ACTIVE && phase === Phase.DAY && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-santa-deepRed" />
              <span className="text-xs text-santa-deepRed/70">Day Vote • Encrypted</span>
            </div>
            <select
              value={voteTarget}
              onChange={(e) => setVoteTarget(e.target.value)}
              className="input w-full bg-white border border-santa-deepRed/20 focus:border-fhenix-purple rounded-lg text-santa-deepRed"
            >
              <option value="">Select target</option>
              {participants.map((p, index) => (
                <option key={p.address} value={index}>
                  {index}. {p.name ? p.name : p.address.slice(0, 6) + "..." + p.address.slice(-4)}
                </option>
              ))}
            </select>
            <button
              onClick={handleVote}
              disabled={isVoting || voteTarget === ""}
              className="btn-fhenix w-full h-11 flex items-center justify-center gap-2"
            >
              {isVoting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Voting...
                </>
              ) : (
                <>
                  <Gavel className="w-4 h-4" />
                  Submit Vote ☀️
                </>
              )}
            </button>
            <label className="flex items-center gap-2 text-xs text-santa-deepRed/70">
              <input
                type="checkbox"
                checked={voteReady}
                onChange={(e) => setVoteReady(e.target.checked)}
              />
              All votes submitted
            </label>
            {isCreator ? (
              voteReady ? (
                <button
                  onClick={handleResolveVote}
                  disabled={isResolvingVote}
                  className="btn-santa w-full h-11 flex items-center justify-center gap-2"
                >
                  {isResolvingVote ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    <>
                      <Gavel className="w-4 h-4" />
                      Resolve Vote
                    </>
                  )}
                </button>
              ) : (
                <div className="p-3 bg-white/60 border border-santa-deepRed/20 rounded-lg text-xs text-santa-deepRed/70 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-santa-deepRed/60" />
                  Confirm all votes are submitted to enable resolve.
                </div>
              )
            ) : (
              <div className="p-3 bg-white/60 border border-santa-deepRed/20 rounded-lg text-xs text-santa-deepRed/70 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-santa-deepRed/60" />
                Only the creator can resolve the vote.
              </div>
            )}
            {(voteError || resolveVoteError) && (
              <p className="text-xs text-santa-deepRed flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {voteError || resolveVoteError}
              </p>
            )}
            {(voteSuccess || resolveVoteSuccess) && (
              <p className="text-xs text-fhenix-purple flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Vote submitted/resolved.
              </p>
            )}
          </div>
        )}

        {gameState === GameState.ENDED && (
          <div className="p-3 bg-fhenix-purple/10 border border-fhenix-purple/30 rounded-lg">
            <p className="text-sm text-fhenix-purple flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Game ended.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
