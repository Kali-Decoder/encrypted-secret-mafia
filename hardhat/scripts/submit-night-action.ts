import { getArg, getSecretMafia, getSignerFromArg, parsePositiveInt, parseUint32, encryptUint32 } from "./game-helpers";

async function main() {
  const signer = await getSignerFromArg();
  const contract = await getSecretMafia(signer);

  const gameIdRaw = "0";
  if (!gameIdRaw) throw new Error("--game-id is required");
  const gameId = parsePositiveInt(gameIdRaw, "game-id");

  const targetRaw = getArg("target-index");
  if (!targetRaw) throw new Error("--target-index is required");
  const target = parseUint32(targetRaw, "target-index");

  const encTarget = await encryptUint32(signer, target);

  const tx = await contract.submitNightAction(gameId, encTarget);
  const receipt = await tx.wait();

  console.log("submitNightAction tx:", receipt?.hash);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
