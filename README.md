# Secret Mafia

An on-chain Secret Mafia game powered by Fhenix FHE on Arbitrum Sepolia. Roles, votes, and alive status are encrypted on-chain.

## Features

- **Encrypted Roles & Votes**: Roles, actions, and votes remain private on-chain
- **Permit-Based Reveal**: Players decrypt only their own role/alive status
- **Night/Day Phases**: Submit actions and votes, then resolve as the creator
- **Arbitrum Sepolia**: Deployed to an EVM testnet with Fhenix FHE

## Project Structure

```
hardhat/          # Smart contracts (Solidity + FHE)
nextjs/           # Frontend (Next.js + wagmi + cofhejs)
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

Install dependencies in each repo:

```bash
cd hardhat
pnpm install
```

```bash
cd nextjs
pnpm install
```

### Environment Setup

Copy the example env files:

```bash
cp hardhat/.env.example hardhat/.env
cp nextjs/.env.example nextjs/.env.local
```

Configure your environment variables:
- `DEPLOYER_PRIVATE_KEY` - Private key for contract deployment
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` - WalletConnect project ID

### Development

Start the frontend:

```bash
cd nextjs
pnpm dev
```

### Deployment

Deploy contracts to Arbitrum Sepolia:

```bash
cd hardhat
pnpm hardhat run scripts/001_deploy_factory.ts --network arb-sepolia
```

## How It Works

1. **Create Game**: Creator chooses a name and shares the game ID
2. **Join Game**: Players join with a nickname
3. **Start**: Creator starts the game and roles are assigned on-chain
4. **Night**: Players submit encrypted night actions, creator resolves
5. **Day**: Players submit encrypted votes, creator resolves
6. **Repeat** until the game ends

## Tech Stack

- **Blockchain**: Arbitrum Sepolia + Fhenix FHE
- **Smart Contracts**: Solidity + Fhenix FHE library
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Web3**: wagmi, viem, cofhejs

## License

MIT
# encrypted-secret-mafia
