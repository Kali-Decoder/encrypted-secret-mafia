import { expect } from "chai";
import hre from "hardhat";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import type { Signer } from "ethers";

async function deploySecretMafia() {
  const Factory = await hre.ethers.getContractFactory("SecretMafia");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  return contract;
}

async function getClient(signer: Signer) {
  if (!hre.cofhe) {
    throw new Error("hre.cofhe is not available. Ensure cofhe-hardhat-plugin is installed and loaded.");
  }
  const networkName = hre.network.name;
  const environment =
    networkName === "hardhat" || networkName === "localhost"
      ? "MOCK"
      : "TESTNET";
  return hre.cofhe.initializeWithHardhatSigner(signer, { environment });
}

async function encryptUint32(signer: Signer, value: bigint) {
  const client = await getClient(signer);
  const encryptedResult = await client.encryptInputs([
    Encryptable.uint32(value)
  ]).encrypt();
  const encrypted = await hre.cofhe.expectResultSuccess(encryptedResult);
  return encrypted[0];
}

async function decryptBool(signer: Signer, handle: bigint) {
  const client = await getClient(signer);
  const decryptResult = await client.decryptHandle(handle, FheTypes.Bool).decrypt();
  return hre.cofhe.expectResultSuccess(decryptResult);
}

async function decryptUint8(signer: Signer, handle: bigint) {
  const client = await getClient(signer);
  const decryptResult = await client.decryptHandle(handle, FheTypes.Uint8).decrypt();
  return hre.cofhe.expectResultSuccess(decryptResult);
}

async function resolveWithRetry(action: () => Promise<void>, retries = 6) {
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      await action();
      return;
    } catch (err) {
      const message = (err as Error).message || "";
      if (!message.includes("DecryptionNotReady")) {
        throw err;
      }
      lastError = err;
      await hre.network.provider.send("evm_mine");
    }
  }
  throw lastError;
}

describe("SecretMafia", function () {
  it("creates a game and sets initial state", async function () {
    const [creator] = await hre.ethers.getSigners();
    const contract = await deploySecretMafia();

    const entropy = await encryptUint32(creator, 123n);
    const tx = await contract.createGame("Game 1", "Alice", entropy);

    await expect(tx).to.emit(contract, "GameCreated").withArgs(0);
    await expect(tx).to.emit(contract, "PlayerJoined").withArgs(0, await creator.getAddress());

    expect(await contract.gameCount()).to.equal(1);

    const players = await contract.getPlayers(0);
    expect(players).to.deep.equal([await creator.getAddress()]);
    expect(await contract.playerIndex(0, await creator.getAddress())).to.equal(1);
    expect(await contract.playerNames(0, await creator.getAddress())).to.equal("Alice");

    const [state, phase, round, aliveCount] = await contract.getGame(0);
    expect(state).to.equal(0); // WAITING
    expect(phase).to.equal(0); // NIGHT
    expect(round).to.equal(1);
    expect(aliveCount).to.equal(0);
  });

  it("allows players to join and prevents joining after start", async function () {
    const [creator, bob] = await hre.ethers.getSigners();
    const contract = await deploySecretMafia();

    const entropyCreator = await encryptUint32(creator, 1n);
    await contract.createGame("Game 1", "Alice", entropyCreator);

    const entropyBob = await encryptUint32(bob, 2n);
    await expect(contract.connect(bob).joinGame(0, "Bob", entropyBob))
      .to.emit(contract, "PlayerJoined")
      .withArgs(0, await bob.getAddress());

    const players = await contract.getPlayers(0);
    expect(players.length).to.equal(2);

    await contract.startGame(0);

    const entropyBob2 = await encryptUint32(bob, 3n);
    await expect(contract.connect(bob).joinGame(0, "Bob", entropyBob2))
      .to.be.revertedWithCustomError(contract, "InvalidState");
  });

  it("only creator can start game and assigns roles/alive state", async function () {
    const [creator, bob] = await hre.ethers.getSigners();
    const contract = await deploySecretMafia();

    const entropyCreator = await encryptUint32(creator, 10n);
    await contract.createGame("Game 1", "Alice", entropyCreator);

    const entropyBob = await encryptUint32(bob, 11n);
    await contract.connect(bob).joinGame(0, "Bob", entropyBob);

    await expect(contract.connect(bob).startGame(0))
      .to.be.revertedWithCustomError(contract, "NotCreator");

    await expect(contract.startGame(0))
      .to.emit(contract, "GameStarted")
      .withArgs(0);

    const [state, phase, round, aliveCount] = await contract.getGame(0);
    expect(state).to.equal(1); // ACTIVE
    expect(phase).to.equal(0); // NIGHT
    expect(round).to.equal(1);
    expect(aliveCount).to.equal(2);

    const creatorRoleHandle = await contract.connect(creator).getMyRole(0);
    const bobRoleHandle = await contract.connect(bob).getMyRole(0);

    const creatorRole = await decryptUint8(creator, creatorRoleHandle);
    const bobRole = await decryptUint8(bob, bobRoleHandle);

    expect(creatorRole).to.equal(1); // MAFIA
    expect(bobRole).to.equal(2); // VILLAGER

    const creatorAliveHandle = await contract.isAlivePlayer(0, await creator.getAddress());
    const bobAliveHandle = await contract.isAlivePlayer(0, await bob.getAddress());

    const creatorAlive = await decryptBool(creator, creatorAliveHandle);
    const bobAlive = await decryptBool(bob, bobAliveHandle);

    expect(creatorAlive).to.equal(true);
    expect(bobAlive).to.equal(true);
  });

  it("runs a full round: night action -> resolve -> vote -> resolve", async function () {
    const [creator, bob, carol] = await hre.ethers.getSigners();
    const contract = await deploySecretMafia();

    await contract.createGame("Game 1", "Alice", await encryptUint32(creator, 111n));
    await contract.connect(bob).joinGame(0, "Bob", await encryptUint32(bob, 222n));
    await contract.connect(carol).joinGame(0, "Carol", await encryptUint32(carol, 333n));

    await contract.startGame(0);

    // Night action: creator targets Bob (index 1 in players array)
    const encTarget = await encryptUint32(creator, 1n);
    await contract.submitNightAction(0, encTarget);

    await resolveWithRetry(async () => {
      const tx = await contract.resolveNight(0);
      await tx.wait();
    });

    const [stateAfterNight, phaseAfterNight, , aliveAfterNight] = await contract.getGame(0);
    expect(stateAfterNight).to.equal(1); // ACTIVE
    expect(phaseAfterNight).to.equal(1); // DAY
    expect(aliveAfterNight).to.equal(2);

    const bobAliveHandle = await contract.isAlivePlayer(0, await bob.getAddress());
    const bobAlive = await decryptBool(bob, bobAliveHandle);
    expect(bobAlive).to.equal(false);

    // Day vote: creator votes to eliminate Carol (index 2)
    const encVote = await encryptUint32(creator, 2n);
    await contract.vote(0, encVote);

    await resolveWithRetry(async () => {
      const tx = await contract.resolveVote(0);
      await tx.wait();
    });

    const [finalState, finalPhase, finalRound, finalAlive] = await contract.getGame(0);
    expect(finalState).to.equal(2); // ENDED
    expect(finalPhase).to.equal(1); // DAY
    expect(finalRound).to.equal(1);
    expect(finalAlive).to.equal(1);
  });
});
