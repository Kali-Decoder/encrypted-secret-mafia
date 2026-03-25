import { getArg, getSecretMafia, parsePositiveInt } from "./game-helpers";

async function main() {
  const contract = await getSecretMafia();

  const gameIdRaw = getArg("--game-id") ?? "0";
  if (!gameIdRaw) throw new Error("--game-id is required");
  const gameId = parsePositiveInt(gameIdRaw, "game-id");

  const [state, phase, round, aliveCount] = await contract.getGame(gameId);
  console.log("Game:", {
    gameId: gameId.toString(),
    state: state.toString(),
    phase: phase.toString(),
    round: round.toString(),
    aliveCount: aliveCount.toString(),
  });

  if (Number(phase) !== 0) {
    console.error("Resolve failed: game is not in NIGHT phase.");
    return;
  }

  // Try a static call first to surface revert reason (DecryptionNotReady/InvalidState)
  try {
    // ethers v6: use .staticCall to simulate
    await contract.resolveNight.staticCall(gameId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const anyErr = err as { data?: string; error?: { data?: string } };
    const data = anyErr?.data ?? anyErr?.error?.data;
    console.error("resolveNight simulation failed:", message);
    if (data) {
      try {
        const decoded = contract.interface.parseError(data);
        console.error("Decoded error:", decoded?.name ?? "Unknown");
        if (decoded?.name === "DecryptionNotReady") {
          console.error("Decryption not ready yet. Wait a bit and retry.");
          return;
        }
        if (decoded?.name === "InvalidState") {
          console.error("Invalid state. Ensure the game is Active and in NIGHT phase.");
          return;
        }
      } catch {
        console.error("Could not decode error data:", data);
      }
    }
    // Fall through for other errors
  }

  const tx = await contract.resolveNight(gameId);
  const receipt = await tx.wait();

  console.log("resolveNight tx:", receipt?.hash);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
