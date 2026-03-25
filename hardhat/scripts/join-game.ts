import { getArg, getSecretMafia, getSignerFromArg, parsePositiveInt, parseUint32, encryptUint32 } from "./game-helpers";

function randomEntropy(): bigint {
  const value = Math.floor(Math.random() * 0xffffffff);
  return BigInt(value);
}

async function main() {
  const signer = await getSignerFromArg();
  const contract = await getSecretMafia(signer);

  const gameIdRaw = "0";
  if (!gameIdRaw) throw new Error("--game-id is required");
  const gameId = parsePositiveInt(gameIdRaw, "game-id");

  const name = "kING";
  const entropyRaw = getArg("entropy");
  const entropy = entropyRaw ? parseUint32(entropyRaw, "entropy") : randomEntropy();

  const encEntropy = await encryptUint32(signer, entropy);

  const tx = await contract.joinGame(gameId, name, encEntropy);
  const receipt = await tx.wait();

  console.log("joinGame tx:", receipt?.hash);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
