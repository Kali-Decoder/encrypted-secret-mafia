import { getArg, getSecretMafia, parsePositiveInt } from "./game-helpers";

async function main() {
  const contract = await getSecretMafia();

  const gameIdRaw = getArg("game-id");
  if (!gameIdRaw) throw new Error("--game-id is required");
  const gameId = parsePositiveInt(gameIdRaw, "game-id");

  const tx = await contract.resolveVote(gameId);
  const receipt = await tx.wait();

  console.log("resolveVote tx:", receipt?.hash);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
