"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import { useAccount } from "wagmi";
import { useCofheStore } from "@/services/store/cofheStore";
import { loadCofheWeb, getCofheWebSync } from "@/utils/cofheWeb";

const getPermitSnapshot = () => {
  const mod = getCofheWebSync();
  const permitResult = mod?.cofhejs?.getPermit?.();
  return !!(permitResult?.success && permitResult?.data);
};

const getServerSnapshot = () => false;

const subscribeNoop = () => () => {};

export function usePermit() {
  const { address, chainId } = useAccount();
  const { isInitialized: isCofheInitialized } = useCofheStore();

  const [isGeneratingPermit, setIsGeneratingPermit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasValidPermit = useSyncExternalStore(
    getCofheWebSync()?.permitStore?.store?.subscribe ?? subscribeNoop,
    () => (isCofheInitialized ? getPermitSnapshot() : false),
    getServerSnapshot
  );

  const checkPermit = useCallback(() => {
    if (!isCofheInitialized) return false;
    return getPermitSnapshot();
  }, [isCofheInitialized]);

  const generatePermit = useCallback(async () => {
    if (!isCofheInitialized || !address || isGeneratingPermit) {
      return { success: false, error: "Not ready to generate permit" };
    }

    const mod = await loadCofheWeb();
    if (!mod) {
      return { success: false, error: "CoFHE not available in this environment" };
    }

    try {
      setIsGeneratingPermit(true);
      setError(null);

      const permitName = "Secret Mafia";
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      const result = await mod.cofhejs.createPermit({
        type: "self",
        name: permitName,
        issuer: address,
        expiration: Math.round(expirationDate.getTime() / 1000),
      });

      if (result?.success) {
        setError(null);
        return { success: true };
      } else {
        const errorMessage = result?.error?.message || "Failed to create permit";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error generating permit";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsGeneratingPermit(false);
    }
  }, [isCofheInitialized, address, isGeneratingPermit]);

  const removePermit = useCallback(async () => {
    if (!isCofheInitialized || !chainId || !address) {
      return false;
    }

    const mod = await loadCofheWeb();
    if (!mod) return false;

    try {
      const activePermitResult = mod.cofhejs?.getPermit?.();
      if (!activePermitResult?.success || !activePermitResult?.data) {
        return false;
      }

      const allPermits = mod.permitStore.getPermits(chainId.toString(), address);
      if (allPermits && Object.keys(allPermits).length > 0) {
        const permitHash = Object.keys(allPermits)[0];
        mod.permitStore.removePermit(chainId.toString(), address, permitHash, true);
      } else {
        return false;
      }

      setError(null);
      return true;
    } catch (err) {
      setError("Failed to remove permit");
      return false;
    }
  }, [isCofheInitialized, chainId, address]);

  return {
    hasValidPermit,
    isGeneratingPermit,
    error,
    generatePermit,
    checkPermit,
    removePermit,
  };
}
