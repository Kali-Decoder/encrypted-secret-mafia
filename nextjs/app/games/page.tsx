"use client";

import { useEffect, useState } from "react";
import { useAllGames, GameInfo, GameState } from "@/hooks/useSecretSanta";
import { GameCard } from "@/components/secretsanta";
import { Loader2, RefreshCw, Filter, ArrowLeft } from "lucide-react";
import { GameDetails } from "@/components/secretsanta";

export default function GamesPage() {
  const { games, isLoading, error, fetchAllGames } = useAllGames();
  const [selectedGame, setSelectedGame] = useState<GameInfo | null>(null);

  useEffect(() => {
    fetchAllGames();
  }, [fetchAllGames]);

  const waiting = games.filter((g) => g.state === GameState.WAITING);
  const active = games.filter((g) => g.state === GameState.ACTIVE);

  if (selectedGame) {
    return (
      <div className="min-h-screen font-sans selection:bg-fhenix-purple selection:text-white">
        <main className="relative z-10 max-w-5xl mx-auto flex flex-col gap-6 p-4 md:p-6">
          <button
            onClick={() => setSelectedGame(null)}
            className="text-white/70 hover:text-white flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Games
          </button>
          <GameDetails gameId={selectedGame.gameId} onBack={() => setSelectedGame(null)} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans selection:bg-fhenix-purple selection:text-white">
      <main className="relative z-10 max-w-5xl mx-auto flex flex-col gap-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white font-display">All Games</h1>
            <p className="text-white/60 text-sm">Waiting and active games on-chain</p>
          </div>
          <button
            onClick={() => fetchAllGames()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all text-white text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="py-10 text-center">
            <Loader2 className="w-8 h-8 text-fhenix-purple/40 animate-spin mx-auto mb-4" />
            <p className="text-white/60">Loading games...</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center">
            <p className="text-pastel-coral">{error}</p>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-white/80">
                <Filter className="w-4 h-4" />
                <h2 className="text-lg font-semibold">Waiting ({waiting.length})</h2>
              </div>
              {waiting.length === 0 ? (
                <p className="text-white/60">No waiting games.</p>
              ) : (
                <div className="space-y-3">
                  {waiting.map((game: GameInfo) => (
                    <GameCard key={`waiting-${game.gameId.toString()}`} game={game} onClick={() => setSelectedGame(game)} />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-white/80">
                <Filter className="w-4 h-4" />
                <h2 className="text-lg font-semibold">Active ({active.length})</h2>
              </div>
              {active.length === 0 ? (
                <p className="text-white/60">No active games.</p>
              ) : (
                <div className="space-y-3">
                  {active.map((game: GameInfo) => (
                    <GameCard key={`active-${game.gameId.toString()}`} game={game} onClick={() => setSelectedGame(game)} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
