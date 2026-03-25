"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
} from "lucide-react";
import { useJoinGame } from "@/hooks/useSecretSanta";
import { useCofheStore } from "@/services/store/cofheStore";
import { useAccount } from "wagmi";

interface JoinGameFormProps {
  onSuccess?: () => void;
  prefillGameId?: string;
}

export const JoinGameForm = ({ onSuccess, prefillGameId }: JoinGameFormProps) => {
  const { isConnected } = useAccount();
  const { isInitialized } = useCofheStore();
  const { joinGame, isLoading, isSuccess, error } = useJoinGame();
  const [gameIdInput, setGameIdInput] = useState("");
  const [nickname, setNickname] = useState("");
  const hasCalledSuccess = useRef(false);

  const parsedGameId = useMemo(() => {
    try {
      const trimmed = gameIdInput.trim();
      if (!trimmed) return null;
      const id = BigInt(trimmed);
      return id >= 0n ? id : null;
    } catch {
      return null;
    }
  }, [gameIdInput]);

  useEffect(() => {
    if (prefillGameId && prefillGameId !== gameIdInput) {
      setGameIdInput(prefillGameId);
    }
  }, [prefillGameId, gameIdInput]);

  useEffect(() => {
    if (isSuccess && !hasCalledSuccess.current) {
      hasCalledSuccess.current = true;
      onSuccess?.();
      const timer = setTimeout(() => {
        setGameIdInput("");
        setNickname("");
        hasCalledSuccess.current = false;
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedGameId || !nickname.trim()) return;
    await joinGame(parsedGameId, nickname.trim());
  };

  const disabledReason = !isConnected
    ? "Connect wallet"
    : !isInitialized
    ? "Initializing FHE..."
    : !parsedGameId
    ? "Enter a valid game ID"
    : !nickname.trim()
    ? "Enter a nickname"
    : isLoading
    ? "Joining..."
    : null;

  return (
    <div className="bg-white p-4 pb-8 rounded-sm shadow-polaroid">
      <div className="bg-pastel-mint rounded-sm p-5">
        <div className="flex items-center justify-end gap-3 mb-4">
          <h3 className="text-lg font-bold font-display text-santa-deepRed">
            Join Game
          </h3>
          <UserPlus className="w-5 h-5 text-santa-deepRed" />
        </div>

        <p className="text-sm text-santa-deepRed/70 mb-4">
          Enter the game ID shared by the creator to join.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-santa-deepRed/80 mb-2 block font-medium">
              Game ID
            </label>
            <input
              type="number"
              value={gameIdInput}
              onChange={(e) => setGameIdInput(e.target.value)}
              placeholder="e.g., 0"
              min="0"
              className="input w-full bg-white border border-santa-deepRed/20 focus:border-fhenix-purple rounded-lg text-santa-deepRed placeholder:text-santa-deepRed/40"
              disabled={!isConnected || isLoading}
            />
          </div>

          <div>
            <label className="text-sm text-santa-deepRed/80 mb-2 block font-medium">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Your Nickname
              </div>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g., Detective"
              className="input w-full bg-white border border-santa-deepRed/20 focus:border-fhenix-purple rounded-lg text-santa-deepRed placeholder:text-santa-deepRed/40"
              disabled={!isConnected || isLoading}
            />
            <p className="text-xs text-santa-deepRed/50 mt-1">
              This name will be visible to other players
            </p>
          </div>

          {error && (
            <div className="p-3 bg-pastel-coral/30 border border-pastel-coral rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-santa-deepRed flex-shrink-0 mt-0.5" />
              <p className="text-sm text-santa-deepRed">{error}</p>
            </div>
          )}

          {isSuccess && (
            <div className="p-3 bg-pastel-mint/50 border border-pastel-mint rounded-lg">
              <p className="text-sm text-santa-deepRed flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Joined successfully!
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={!isConnected || !isInitialized || !parsedGameId || !nickname.trim() || isLoading}
            className="btn-fhenix w-full h-12 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Join Game
              </>
            )}
          </button>

          {disabledReason && (
            <p className="text-center text-sm text-santa-deepRed/50">
              {disabledReason}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
