import hre from "hardhat";
import { Encryptable } from "@cofhe/sdk";
import { createCofheClient, createCofheConfig } from "@cofhe/sdk/node";
import { arbSepolia, sepolia, baseSepolia } from "@cofhe/sdk/chains";
import { createPublicClient, createWalletClient, http } from "viem";
import { arbitrumSepolia, sepolia as viemSepolia, baseSepolia as viemBaseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import type { Signer } from "ethers";

export function getArg(name: string): string | undefined {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required (set it in your env or pass --address).`);
  }
  return value;
}

export function parsePositiveInt(value: string, label: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return n;
}

export function parseUint32(value: string, label: string): bigint {
  const n = BigInt(value);
  if (n < 0n || n > 0xffffffffn) {
    throw new Error(`${label} must fit in uint32`);
  }
  return n;
}

export async function getSignerFromArg(): Promise<Signer> {
  const signerIndexRaw = getArg("signer-index");
  const signerIndex = signerIndexRaw ? parsePositiveInt(signerIndexRaw, "signer-index") : 0;
  const signers = await hre.ethers.getSigners();
  if (!signers[signerIndex]) {
    throw new Error(`No signer at index ${signerIndex}`);
  }
  return signers[signerIndex];
}

export async function getSecretMafia(signer?: Signer) {
  const address = getArg("address") ?? process.env.SECRET_MAFIA_ADDRESS;
  if (!address) {
    throw new Error("SECRET_MAFIA_ADDRESS or --address is required.");
  }
  const resolvedSigner = signer ?? (await getSignerFromArg());
  return hre.ethers.getContractAt("SecretMafia", address, resolvedSigner);
}

let cachedClient: ReturnType<typeof createCofheClient> | null = null;

function getChainConfig(networkName: string) {
  if (networkName === "arb-sepolia") {
    return {
      cofheChain: arbSepolia,
      viemChain: arbitrumSepolia,
      rpcUrl: process.env.ARB_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
    };
  }
  if (networkName === "eth-sepolia") {
    return {
      cofheChain: sepolia,
      viemChain: viemSepolia,
      rpcUrl: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia.publicnode.com",
    };
  }
  if (networkName === "base-sepolia") {
    return {
      cofheChain: baseSepolia,
      viemChain: viemBaseSepolia,
      rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    };
  }
  throw new Error(`Unsupported network for SDK client: ${networkName}`);
}

async function getSdkClient() {
  if (cachedClient) return cachedClient;

  const networkName = hre.network.name;
  const { cofheChain, viemChain, rpcUrl } = getChainConfig(networkName);

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY is required for arb/eth/base sepolia encryption");
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const publicClient = createPublicClient({
    chain: viemChain,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    chain: viemChain,
    transport: http(rpcUrl),
    account,
  });

  const config = createCofheConfig({
    supportedChains: [cofheChain],
  });

  const client = createCofheClient(config);
  await client.connect(publicClient, walletClient);

  cachedClient = client;
  return client;
}

export async function encryptUint32(signer: Signer, value: bigint) {
  const networkName = hre.network.name;

  if (networkName === "hardhat" || networkName === "localhost") {
    if (!hre.cofhe) {
      throw new Error("hre.cofhe is not available. Ensure cofhe-hardhat-plugin is installed and loaded.");
    }
    const client = await hre.cofhe.initializeWithHardhatSigner(signer, { environment: "MOCK" });
    const encryptedResult = await client.encryptInputs([
      Encryptable.uint32(value)
    ]).encrypt();
    const encrypted = await hre.cofhe.expectResultSuccess(encryptedResult);
    return encrypted[0];
  }

  if (networkName === "arb-sepolia" || networkName === "eth-sepolia" || networkName === "base-sepolia") {
    const client = await getSdkClient();
    const encrypted = await client.encryptInputs([
      Encryptable.uint32(value)
    ]).execute();
    return encrypted[0];
  }

  throw new Error(`Unsupported network for encryption: ${networkName}`);
}
