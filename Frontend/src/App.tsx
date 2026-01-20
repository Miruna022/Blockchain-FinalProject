import { useState } from "react";
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { ethers, BrowserProvider } from "ethers";
import { Transaction } from '@mysten/sui/transactions';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromBase64 } from '@mysten/sui/utils';

// config
const ETH_CONTRACT_ADDRESS = "0x948B3c65b89DF0B4894ABE91E6D02FE579834F8F"; //gotta be changed each time
const ETH_ABI = [
    "function burn(uint256 amount) public",
    "function mint(address to, uint256 amount) public"
];
const SUI_PACKAGE_ID = "0x3f77949edfb9150c9efd9a5d4db0dd832f0622b2b036545c9fb0aa1ae34a94ad"; //gotta be changed each time
const SUI_MODULE_NAME = "bridge";
const SUI_TREASURY_CAP_ID = "0x6f4066c2fd2d3851935cd0fc0b9bf3b61a9518e697c297db377e02bd0073b50c"; //gotta be changed each time
const SUI_COIN_TYPE = `${SUI_PACKAGE_ID}::${SUI_MODULE_NAME}::BRIDGE`;

const ADMIN_PRIVATE_KEY_ETH = "PUT_PRIVATE_KEY_HEREEE";
const ADMIN_PRIVATE_KEY_SUI = "PUT_PRIVATE_KEY_HEREEE";


declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ethereum?: any;
    }
}

function App() {
    const [ethWallet, setEthWallet] = useState<string | null>(null);
    const [amountEthToSui, setAmountEthToSui] = useState("");
    const [amountSuiToEth, setAmountSuiToEth] = useState("");
    const [status, setStatus] = useState("Idle");

    const suiAccount = useCurrentAccount();
    const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

    // Connect MetaMask
    const connectMetaMask = async () => {
        if (window.ethereum) {
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            setEthWallet(await signer.getAddress());
        } else {
            alert("Please install MetaMask!");
        }
    };

    // ETH -> SUI
    const bridgeEthToSui = async () => {
        if (!ethWallet || !suiAccount) return alert("Connect both wallets first!");

        try {
            setStatus("Burning on Ethereum...");

            // burn (eth)
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const ethContract = new ethers.Contract(ETH_CONTRACT_ADDRESS, ETH_ABI, signer);

            const amountWei = ethers.parseUnits(amountEthToSui, 18);
            const burnTx = await ethContract.burn(amountWei);
            await burnTx.wait();

            // mint (sui)
            setStatus("Minting on Sui...");


            const adminKeypair = Ed25519Keypair.fromSecretKey(fromBase64(ADMIN_PRIVATE_KEY_SUI).slice(1));
            const client = new SuiClient({ url: getFullnodeUrl('devnet') });
            const tx = new Transaction();

            tx.moveCall({
                target: `${SUI_PACKAGE_ID}::${SUI_MODULE_NAME}::mint_ibt`,
                arguments: [
                    tx.object(SUI_TREASURY_CAP_ID),
                    tx.pure.u64(Number(amountEthToSui) * 1_000_000_000),
                    tx.pure.address(suiAccount.address)
                ],
            });

            await client.signAndExecuteTransaction({
                signer: adminKeypair,
                transaction: tx,
            });

            setStatus("Success! Eth -> Sui Complete.");
            setAmountEthToSui("");

        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error(error);
            setStatus("Error: " + (error.message || "Something went wrong"));
        }
    };


    // SUI -> ETH
    const bridgeSuiToEth = async () => {
        if (!ethWallet || !suiAccount) return alert("Connect both wallets first!");

        try {
            setStatus("Burning on Sui...");
            const client = new SuiClient({ url: getFullnodeUrl('devnet') });
            const tx = new Transaction();

            // find coins
            const coins = await client.getCoins({
                owner: suiAccount.address,
                coinType: SUI_COIN_TYPE,
            });

            if (coins.data.length === 0) throw new Error("No IBT tokens found!");
            const primaryCoin = coins.data[0].coinObjectId;

            // prepare the amount (uses 9 decimals)
            const amountSui = Number(amountSuiToEth) * 1_000_000_000;

            // split coin
            const [coinToSend] = tx.splitCoins(tx.object(primaryCoin), [
                tx.pure.u64(amountSui)
            ]);

            const adminAddress = Ed25519Keypair.fromSecretKey(fromBase64(ADMIN_PRIVATE_KEY_SUI).slice(1)).toSuiAddress();
            tx.transferObjects([coinToSend], tx.pure.address(adminAddress));
            await signAndExecute({ transaction: tx });

            // mint (eth)
            setStatus("Minting on Ethereum...");

            const provider = new BrowserProvider(window.ethereum);
            const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY_ETH, provider);
            const ethContract = new ethers.Contract(ETH_CONTRACT_ADDRESS, ETH_ABI, adminWallet);

            const amountWei = ethers.parseUnits(amountSuiToEth, 18);
            const txEth = await ethContract.mint(ethWallet, amountWei);
            await txEth.wait();

            setStatus("Success! Sui -> Eth Complete.");
            setAmountSuiToEth("");

        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error(error);
            setStatus("Error: " + (error.message || "Failed"));
        }
    };

    return (
        <div style={{ padding: "20px", textAlign: "center", fontFamily: "sans-serif", width:"100vw", height: "100vh", background: "#1a1a1a", color: "white", boxSizing:"border-box" }}>
            <h1>Bridge.io 𖣑</h1>
            <p>Status: <strong>{status}</strong></p>

            <div style={{ display: "flex", justifyContent: "space-evenly", marginTop: "50px" }}>

                {/* ETHEREUM SIDE */}
                <div style={{ border: "1px solid #0096FF", padding: "20px", borderRadius: "10px", width: "20%" }}>
                    <h2>Ethereum Chain</h2>
                    {!ethWallet ? (
                        <button
                            onClick={connectMetaMask}
                            style={{
                                padding: "10px",
                                background:"#f6f7f9",
                                borderRadius:"12px",
                                fontFamily:"Inter, sans-serif",
                                fontWeight: 100,
                                fontSize: "16px",
                                color: "#262b46",
                                border: "none",
                                cursor: "pointer"
                        }}>Connect MetaMask</button>
                    ) : (
                        <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
                            Connected: {ethWallet.slice(0,6)}...{ethWallet.slice(-4)}
                        </p>
                    )}
                    <hr />
                    <h3>IBT to Sui {'->'}</h3>
                    <input
                        type="number"
                        placeholder="Amount IBT"
                        value={amountEthToSui}
                        onChange={(e) => setAmountEthToSui(e.target.value)}
                        style={{ padding: "10px", marginRight: "10px" }}
                    />
                    <button onClick={bridgeEthToSui} style={{ padding: "10px" }}>Send</button>
                </div>

                {/* SUI SIDE */}
                <div style={{ border: "1px solid #0096FF", padding: "20px", borderRadius: "10px", width: "20%" }}>
                    <h2>Sui Chain</h2>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                        <ConnectButton />
                    </div>
                    {suiAccount && <p>Connected: {suiAccount.address.slice(0,6)}...</p>}
                    <hr />
                    <h3>IBT to Ethereum {'->'}</h3>
                    <input
                        type="number"
                        placeholder="Amount IBT"
                        value={amountSuiToEth}
                        onChange={(e) => setAmountSuiToEth(e.target.value)}
                        style={{ padding: "10px", marginRight: "10px" }}
                    />
                    <button onClick={bridgeSuiToEth} style={{ padding: "10px" }}>Send</button>
                </div>
            </div>
        </div>
    );
}

export default App;