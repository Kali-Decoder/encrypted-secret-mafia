"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, AlertCircle, Key, Shield, HeartPulse } from "lucide-react";
import { useMyRole, useIsAlive } from "@/hooks/useSecretSanta";
import { usePermit } from "@/hooks/usePermit";
import { useCofheStore } from "@/services/store/cofheStore";
import { PermitModal } from "@/components/PermitModal";
import { useAccount } from "wagmi";

interface TargetRevealProps {
  gameId: bigint;
  refreshTrigger?: number;
}

const roleLabel = (value: number | null) => {
  if (value === null) return "Unknown ❓";
  if (value === 1) return "Mafia 😈";
  if (value === 2) return "Villager 🧑‍🌾";
  return `Role ${value}`;
};

export const TargetReveal = ({ gameId, refreshTrigger }: TargetRevealProps) => {
  const { address } = useAccount();
  const { isInitialized } = useCofheStore();
  const { hasValidPermit } = usePermit();
  const {
    encryptedRole,
    role,
    isLoading: isRoleLoading,
    error: roleError,
    fetchMyRole,
    unsealRole,
  } = useMyRole(gameId);
  const {
    encryptedAlive,
    alive,
    isLoading: isAliveLoading,
    error: aliveError,
    fetchAlive,
    unsealAlive,
  } = useIsAlive(gameId, address ?? null);

  const [showRole, setShowRole] = useState(false);
  const [showAlive, setShowAlive] = useState(false);
  const [isPermitModalOpen, setIsPermitModalOpen] = useState(false);

  useEffect(() => {
    fetchMyRole();
    fetchAlive();
  }, [fetchMyRole, fetchAlive, refreshTrigger]);

  const handleRevealRole = async () => {
    if (!hasValidPermit) {
      setIsPermitModalOpen(true);
      return;
    }
    if (role === null) {
      await unsealRole();
    }
    setShowRole(true);
  };

  const handleRevealAlive = async () => {
    if (!hasValidPermit) {
      setIsPermitModalOpen(true);
      return;
    }
    if (alive === null) {
      await unsealAlive();
    }
    setShowAlive(true);
  };

  const loading = isRoleLoading || isAliveLoading;
  const error = roleError || aliveError;

  return (
    <div className="bg-white p-4 pb-8 rounded-sm shadow-polaroid transform rotate-2 hover:rotate-0 transition-transform duration-300 encrypted-glow">
      <div className="bg-pastel-coral rounded-sm p-5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-fhenix-purple to-transparent animate-pulse" />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-santa-deepRed" />
          <h3 className="text-lg font-bold font-display text-santa-deepRed">
            Your Role
          </h3>
        </div>

        <p className="text-sm text-santa-deepRed/70 mb-6">
          Your role and alive status are encrypted on-chain using FHE. Only you can decrypt them with your permit.
        </p>

        {error && (
          <div className="p-3 mb-4 bg-white/50 border border-santa-deepRed/30 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-santa-deepRed flex-shrink-0 mt-0.5" />
            <p className="text-sm text-santa-deepRed">{error}</p>
          </div>
        )}

        {!encryptedRole ? (
          <div className="py-6 text-center">
            <Loader2 className="w-8 h-8 text-fhenix-purple/40 animate-spin mx-auto mb-4" />
            <p className="text-sm text-santa-deepRed/60">Loading your encrypted role...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {showRole ? (
              <div className="p-4 bg-fhenix-purple/10 border border-fhenix-purple/30 rounded-lg text-center">
                <p className="text-sm text-santa-deepRed/70 mb-2">Role</p>
                <p className="text-xl font-bold text-santa-deepRed">{roleLabel(role)}</p>
              </div>
            ) : (
              <div className="p-4 bg-white/30 border border-santa-deepRed/10 rounded-lg text-center">
                <p className="text-santa-deepRed/60 font-mono">••••••••</p>
                <p className="text-xs text-santa-deepRed/40 mt-2">Click below to reveal</p>
              </div>
            )}

            {!hasValidPermit ? (
              <button
                onClick={() => setIsPermitModalOpen(true)}
                className="btn-fhenix w-full h-12 flex items-center justify-center gap-2"
              >
                <Key className="w-5 h-5" />
                Generate Permit First
              </button>
            ) : (
              <button
                onClick={handleRevealRole}
                disabled={loading || !isInitialized}
                className="btn-fhenix w-full h-12 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Decrypting...
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5" />
                    Reveal My Role
                  </>
                )}
              </button>
            )}

            <div className="pt-4 border-t border-santa-deepRed/10">
              {showAlive ? (
                <div className="p-4 bg-fhenix-purple/10 border border-fhenix-purple/30 rounded-lg text-center">
                  <p className="text-sm text-santa-deepRed/70 mb-2">Alive Status</p>
                  <p className="text-xl font-bold text-santa-deepRed">
                    {alive ? "Alive ❤️" : "Eliminated 💀"}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-white/30 border border-santa-deepRed/10 rounded-lg text-center">
                  <p className="text-santa-deepRed/60 font-mono">••••••••</p>
                  <p className="text-xs text-santa-deepRed/40 mt-2">Click below to reveal</p>
                </div>
              )}

              {!hasValidPermit ? (
                <button
                  onClick={() => setIsPermitModalOpen(true)}
                  className="btn-fhenix w-full h-12 flex items-center justify-center gap-2 mt-3"
                >
                  <Key className="w-5 h-5" />
                  Generate Permit First
                </button>
              ) : (
                <button
                  onClick={handleRevealAlive}
                  disabled={loading || !isInitialized}
                  className="btn-fhenix w-full h-12 flex items-center justify-center gap-2 mt-3"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Decrypting...
                    </>
                  ) : (
                    <>
                      <HeartPulse className="w-5 h-5" />
                      Reveal Alive Status
                    </>
                  )}
                </button>
              )}
            </div>

            {showRole && (
              <button
                onClick={() => setShowRole(false)}
                className="w-full py-3 text-santa-deepRed/70 hover:text-santa-deepRed flex items-center justify-center gap-2 transition-colors"
              >
                <EyeOff className="w-4 h-4" />
                Hide Role
              </button>
            )}
          </div>
        )}

        <PermitModal isOpen={isPermitModalOpen} onClose={() => setIsPermitModalOpen(false)} />
      </div>
    </div>
  );
};
