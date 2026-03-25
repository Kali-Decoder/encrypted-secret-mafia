import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function deploySecretMafia() {
  const CONTRACT_NAME = "SecretMafia";

  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = deployer.address;

  const balance = await hre.ethers.provider.getBalance(deployerAddress);
  const balanceInEth = hre.ethers.formatEther(balance);

  console.log("Deploying SecretMafia...");
  console.log("Deployer:", deployerAddress);
  console.log("Balance:", balanceInEth, "ETH");

  // Deploy contract (no constructor args)
  const contract = await hre.ethers.deployContract(CONTRACT_NAME, []);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  console.log("SecretMafia deployed at:", contractAddress);

  const deployTx = contract.deploymentTransaction();
  if (deployTx) {
    // Give the chain a moment to index the contract
    await deployTx.wait(2);
  }

  const code = await hre.ethers.provider.getCode(contractAddress);
  if (code === "0x") {
    console.warn("Warning: no contract code found yet. Skipping gameCount check.");
  } else {
    // Basic sanity check
    try {
      const gameCount = await contract.gameCount();
      console.log("Initial gameCount:", gameCount.toString());
    } catch (err) {
      console.warn("Warning: gameCount call failed. Skipping.", err);
    }
  }

  // Network info
  const network = await hre.ethers.provider.getNetwork();
  const hardhatNetwork = process.env.HARDHAT_NETWORK || network.name;

  const deploymentInfo = {
    contractName: CONTRACT_NAME,
    address: contractAddress,
    deployer: deployerAddress,
    network: hardhatNetwork,
    chainId: network.chainId.toString(),
    deployedAt: new Date().toISOString(),
    features: {
      fheEnabled: true,
      privateRoles: true,
      privateVoting: true,
      asyncDecryption: true
    }
  };

  // Save deployment
  const deploymentsDir = path.join(__dirname, "../deployments");

  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const file = path.join(
    deploymentsDir,
    `${CONTRACT_NAME}-${Date.now()}.json`
  );

  fs.writeFileSync(file, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment saved:", file);

  const latest = path.join(
    deploymentsDir,
    `latest-${hardhatNetwork}.json`
  );

  fs.writeFileSync(latest, JSON.stringify(deploymentInfo, null, 2));
  console.log("Latest pointer saved:", latest);

  console.log(`\nSet env:\nSECRET_MAFIA_ADDRESS=${contractAddress}`);

  console.log("\n✅ Deployment successful!");
  console.log("Next steps:");
  console.log("1. Create a game");
  console.log("2. Join with multiple wallets");
  console.log("3. Start game & test roles");
  console.log("4. Simulate night + voting");

  return contractAddress;
}

async function main() {
  await deploySecretMafia();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
