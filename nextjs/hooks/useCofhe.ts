"use client";

import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useSyncExternalStore,
} from "react";
import type {
  Encryptable as EncryptableType,
  Environment,
  FheTypes as FheTypesType,
  Permit,
  PermitOptions,
} from "cofhejs/web";
import { Address } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useCofheStore } from "@/services/store/cofheStore";
import { loadCofheWeb, getCofheWebSync } from "@/utils/cofheWeb";

interface CofheConfig {
  environment: Environment;
  coFheUrl?: string;
  verifierUrl?: string;
  thresholdNetworkUrl?: string;
  ignoreErrors?: boolean;
  generatePermit?: boolean;
}

export function useCofhe(config?: Partial<CofheConfig>) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { isConnected } = useAccount();
  const {
    isInitialized: globalIsInitialized,
    setIsInitialized: setGlobalIsInitialized,
  } = useCofheStore();

  const chainId = publicClient?.chain?.id;
  const accountAddress = walletClient?.account?.address;

  const [isInitializing, setIsInitializing] = useState(false);
  const [isGeneratingPermit, setIsGeneratingPermit] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [permit, setPermit] = useState<Permit | undefined>(undefined);
  const [cofheLoaded, setCofheLoaded] = useState(false);
  const [Encryptable, setEncryptable] = useState<EncryptableType | null>(null);
  const [FheTypes, setFheTypes] = useState<FheTypesType | null>(null);

  const isBrowser = typeof window !== "undefined";

  useEffect(() => {
    let mounted = true;
    if (!isBrowser) return;
    loadCofheWeb().then((mod) => {
      if (!mounted || !mod) return;
      setEncryptable(mod.Encryptable);
      setFheTypes(mod.FheTypes);
      setCofheLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, [isBrowser]);

  useEffect(() => {
    setGlobalIsInitialized(false);
  }, [chainId, accountAddress, setGlobalIsInitialized]);

  useEffect(() => {
    if (!isBrowser || !isConnected) return;

    const initialize = async () => {
      if (
        globalIsInitialized ||
        isInitializing ||
        !publicClient ||
        !walletClient
      )
        return;

      const mod = await loadCofheWeb();
      if (!mod) return;

      try {
        setIsInitializing(true);

        const defaultConfig = {
          verifierUrl: undefined,
          coFheUrl: undefined,
          thresholdNetworkUrl: undefined,
          ignoreErrors: false,
          generatePermit: false,
        };

        const mergedConfig = { ...defaultConfig, ...config };
        const result = await mod.cofhejs.initializeWithViem({
          viemClient: publicClient,
          viemWalletClient: walletClient,
          environment: "TESTNET",
          verifierUrl: mergedConfig.verifierUrl,
          coFheUrl: mergedConfig.coFheUrl,
          thresholdNetworkUrl: mergedConfig.thresholdNetworkUrl,
          ignoreErrors: mergedConfig.ignoreErrors,
          generatePermit: mergedConfig.generatePermit,
        });

        if (result.success) {
          setGlobalIsInitialized(true);
          setPermit(result.data);
          setError(null);
        } else {
          setError(new Error(result.error.message || String(result.error)));
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Unknown error initializing Cofhe")
        );
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, [
    isConnected,
    walletClient,
    publicClient,
    config,
    chainId,
    isInitializing,
    accountAddress,
    globalIsInitialized,
    setGlobalIsInitialized,
    isBrowser,
  ]);

  const createPermit = useCallback(
    async (permitOptions?: PermitOptions) => {
      if (!globalIsInitialized || !accountAddress) {
        return {
          success: false,
          error: "CoFHE not initialized or wallet not connected",
        };
      }

      const mod = await loadCofheWeb();
      if (!mod) {
        return {
          success: false,
          error: "CoFHE not available in this environment",
        };
      }

      try {
        setIsGeneratingPermit(true);
        setError(null);

        const result = await mod.cofhejs.createPermit(permitOptions);

        if (result.success) {
          setPermit(result.data);
          setError(null);
          return result;
        } else {
          setError(new Error(result.error.message || String(result.error)));
          return result;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Unknown error generating permit";
        const errorResult = {
          success: false as const,
          error: { message: errorMessage },
        };
        setError(new Error(errorMessage));
        return errorResult;
      } finally {
        setIsGeneratingPermit(false);
      }
    },
    [globalIsInitialized, accountAddress]
  );

  return {
    isInitialized: globalIsInitialized,
    isInitializing,
    isGeneratingPermit,
    error,
    permit,
    createPermit,
    cofheLoaded,
    Encryptable,
    FheTypes,
  };
}

const getInitializedState = () => {
  const mod = getCofheWebSync();
  const state = mod?.cofhejs?.store?.getState?.();
  if (!state) return false;
  return state.providerInitialized && state.signerInitialized && state.fheKeysInitialized;
};

const getAccountState = () => {
  const mod = getCofheWebSync();
  return mod?.cofhejs?.store?.getState?.().account ?? null;
};

const getActivePermitHashState = () => {
  const mod = getCofheWebSync();
  return (mod?.permitStore?.store?.getState?.().activePermitHash ?? {}) as unknown as Record<
    Address,
    string | undefined
  >;
};

const subscribeNoop = () => () => {};

export const useCofhejsInitialized = () => {
  const initialized = useSyncExternalStore(
    getCofheWebSync()?.cofhejs?.store?.subscribe ?? subscribeNoop,
    getInitializedState,
    () => false
  );
  return initialized;
};

export const useCofhejsAccount = () => {
  const account = useSyncExternalStore(
    getCofheWebSync()?.cofhejs?.store?.subscribe ?? subscribeNoop,
    getAccountState,
    () => null
  );
  return account;
};

export const useActivePermitHash = () => {
  const activePermitHash = useSyncExternalStore(
    getCofheWebSync()?.permitStore?.store?.subscribe ?? subscribeNoop,
    getActivePermitHashState,
    () => ({} as Record<Address, string | undefined>)
  );
  return activePermitHash;
};
