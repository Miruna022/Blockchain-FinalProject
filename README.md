# Blockchain-FinalProject (IBT)
A cross-chain bridge app that allows users to transfer IBT tokens between Ethereum and Sui

## How to Run
1. **Start local blockchains:**
    - Sui: `sui start`
    - Ethereum: `anvil`
    
2. **Deploy contracts:**
    - Deploy `IBTToken.sol` to Anvil
    - Deploy `bridge.move` to Sui localnet

3. **Update Frontend:**
    - Update `App.tsx` with the corresponding contract IDs and Admin Private Keys

4. **Start the web application:**
    ```bash
    npm install
    npm run dev

## Tech Stack
**Frontend:** React, TypeScript, Sui dApp Kit,Ethers.js

**Ethereum:** Solidity, Anvil

**Sui:** Move, Sui CLI
