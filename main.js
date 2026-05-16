import { Buffer } from 'buffer';
import * as bip39 from 'bip39';
import { HDNodeWallet, Mnemonic } from 'ethers';
import { TonClient, WalletContractV4, WalletContractV5R1, HighloadWalletContractV2 } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';

window.Buffer = Buffer;

let masterV5Address = null;

const tonClient = new TonClient({
    endpoint: 'https://toncenter.com/api/v2/jsonRPC'
});

function log(text, level = 'info') {
    const container = document.getElementById('masterLogStream');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${level}`;
    entry.innerText = `[${new Date().toLocaleTimeString()}] ${text}`;
    container.appendChild(entry);
    container.scrollTop = container.scrollHeight;
}

// Generate Seed
document.getElementById('runGenSeed').addEventListener('click', () => {
    try {
        const mnemonic = bip39.generateMnemonic(256);
        document.getElementById('walletSeedInput').value = mnemonic;
        log("✅ 24-word mnemonic generated successfully", "success");
    } catch (e) {
        log("Seed generation failed: " + e.message, "error");
    }
});

// Derive Wallets
document.getElementById('runLoadEcosystem').addEventListener('click', async () => {
    const input = document.getElementById('walletSeedInput').value.trim();
    const words = input.split(/\s+/).filter(Boolean);

    if (words.length !== 12 && words.length !== 24) {
        log(`Invalid seed: ${words.length} words (need 12 or 24)`, "error");
        return;
    }

    if (!bip39.validateMnemonic(words.join(' '))) {
        log("❌ Invalid mnemonic checksum", "error");
        return;
    }

    log("Deriving keys across chains...", "success");

    try {
        // TON
        const keyPair = await mnemonicToPrivateKey(words);

        const v5 = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });
        const v4 = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
        const hl = HighloadWalletContractV2.create({ workchain: 0, publicKey: keyPair.publicKey });

        masterV5Address = v5.address;

        document.getElementById('tonOutV5NB').innerText = v5.address.toString({ bounceable: false, urlSafe: true });
        document.getElementById('tonOutV5B').innerText = v5.address.toString({ bounceable: true, urlSafe: true });
        document.getElementById('tonOutV4NB').innerText = v4.address.toString({ bounceable: false, urlSafe: true });
        document.getElementById('tonOutHLNB').innerText = hl.address.toString({ bounceable: false, urlSafe: true });

        log("✅ TON wallets derived (V5R1, V4R2, Highload)", "success");

        // EVM
        const ethMnemonic = Mnemonic.fromPhrase(words.join(' '));
        const hdNode = HDNodeWallet.fromMnemonic(ethMnemonic);
        const eth = hdNode.derivePath("m/44'/60'/0'/0/0");
        document.getElementById('ethAddressOut').innerText = eth.address;
        log("✅ Ethereum address derived", "success");

        // TRON
        const tronNode = hdNode.derivePath("m/44'/195'/0'/0/0");
        document.getElementById('tronAddressOut').innerText = "T" + tronNode.address.replace('0x','').slice(0,34);
        log("✅ TRON address derived", "success");

    } catch (err) {
        console.error(err);
        log("❌ Derivation failed: " + err.message, "error");
    }
});

// Query Balance
document.getElementById('runQueryNode').addEventListener('click', async () => {
    if (!masterV5Address) {
        log("Please derive wallet first", "error");
        return;
    }
    log("Querying TON balance...");
    try {
        const state = await tonClient.getContractState(masterV5Address);
        const balance = (Number(state.balance) / 1e9).toFixed(4);
        document.getElementById('telemetryBalance').innerText = `${balance} TON`;
        log(`✅ Balance: ${balance} TON`, "success");
    } catch (err) {
        log("RPC error: " + err.message, "error");
    }
});
