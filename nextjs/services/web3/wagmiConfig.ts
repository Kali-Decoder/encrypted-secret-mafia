"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  rabbyWallet,
  walletConnectWallet,
  rainbowWallet,
  trustWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { arbitrumSepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Secret Mafia",
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id",
  chains: [arbitrumSepolia],
  ssr: true,
  wallets: [
    {
      groupName: "Popular",
      wallets: [
        walletConnectWallet,
        rainbowWallet,
        trustWallet,
        rabbyWallet,
        injectedWallet,
      ],
    },
  ],
});
