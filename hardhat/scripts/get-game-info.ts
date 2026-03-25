import { getArg, getSecretMafia, parsePositiveInt } from "./game-helpers";

async function main() {
  const contract = await getSecretMafia();
  const gameIdRaw = "0";
  const gameId = parsePositiveInt(gameIdRaw, "game-id");
  const [state, phase, round, aliveCount] = await contract.getGame(gameId);
  const players = await contract.getPlayers(gameId);

  const playerInfos = await Promise.all(
    players.map(async (addr: string) => {
      const name = await contract.playerNames(gameId, addr);
      return { address: addr, name };
    })
  );

  console.log("Game:", gameId);
  console.log("State:", Number(state));
  console.log("Phase:", Number(phase));
  console.log("Round:", Number(round));
  console.log("AliveCount:", Number(aliveCount));
  console.log("Players:");
  for (const p of playerInfos) {
    console.log(`- ${p.address} (${p.name})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
