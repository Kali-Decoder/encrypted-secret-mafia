"use client";

import { X, Users, Eye, Lock, Shield, Moon, Sun, Play, Gavel } from "lucide-react";

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal = ({ isOpen, onClose }: HowToPlayModalProps) => {
  if (!isOpen) return null;

  const steps = [
    {
      icon: Shield,
      title: "Create or Join",
      description:
        "Create a game and share the Game ID, or join one with the ID and your name.",
    },
    {
      icon: Users,
      title: "Gather Players",
      description:
        "Once everyone joins, the creator starts the game.",
    },
    {
      icon: Play,
      title: "Start & Roles",
      description:
        "Roles are assigned on-chain. Use a permit to reveal yours.",
    },
    {
      icon: Moon,
      title: "Night 🌙",
      description:
        "Everyone submits a target. The creator resolves the night.",
    },
    {
      icon: Sun,
      title: "Day ☀️",
      description:
        "Everyone votes. The creator resolves the vote.",
    },
    {
      icon: Gavel,
      title: "Repeat",
      description:
        "Night and Day repeat until the game ends.",
    },
    {
      icon: Lock,
      title: "Permits 🔐",
      description:
        "Generate a permit to decrypt your role and alive status (only you can see it).",
    },
    {
      icon: Eye,
      title: "Reveal 🎭",
      description:
        "Use the permit to reveal your role and alive status.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-santa-deepRed/10 bg-fhenix-purple/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-fhenix-purple/20 rounded-lg">
              <Shield className="w-5 h-5 text-fhenix-purple" />
            </div>
            <h2 className="text-lg font-bold text-santa-deepRed font-display">
              How to Play
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-santa-deepRed/50 hover:text-santa-deepRed rounded-lg hover:bg-santa-deepRed/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="p-4 bg-pastel-cream rounded-lg">
            <p className="text-sm text-santa-deepRed">
              Secret Mafia uses Fully Homomorphic Encryption (FHE). Your role and votes stay private.
            </p>
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex gap-4 p-4 bg-pastel-mint/20 rounded-lg"
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-fhenix-purple/20 rounded-full flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-fhenix-purple" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-fhenix-purple">
                      Step {index + 1}
                    </span>
                  </div>
                  <h3 className="font-semibold text-santa-deepRed text-sm">
                    {step.title}
                  </h3>
                  <p className="text-xs text-santa-deepRed/70 mt-1">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-fhenix-purple/10 rounded-lg border border-fhenix-purple/20">
            <p className="text-xs text-santa-deepRed/80 text-center">
              <Lock className="w-3 h-3 inline-block mr-1" />
              Powered by Fhenix FHE on Arbitrum Sepolia
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-santa-deepRed/10 bg-pastel-cream/30">
          <button onClick={onClose} className="btn-fhenix w-full h-10">
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};
