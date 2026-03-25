import { getArg, getSecretMafia, getSignerFromArg, parseUint32, encryptUint32 } from "./game-helpers";

function randomEntropy(): bigint {
  const value = Math.floor(Math.random() * 0xffffffff);
  return BigInt(value);
}

async function main() {
  const signer = await getSignerFromArg();
  const contract = await getSecretMafia(signer);

  const name = "Secret Mafia";
  const creatorName = "Creator";
  const entropyRaw = getArg("entropy");
  const entropy = entropyRaw ? parseUint32(entropyRaw, "entropy") : randomEntropy();

  const encEntropy = await encryptUint32(signer, entropy);

  const tx = await contract.createGame(name, creatorName, encEntropy);
  const receipt = await tx.wait();

  console.log("createGame tx:", receipt?.hash);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
