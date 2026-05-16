import { Buffer } from 'buffer';
import * as bip39 from 'bip39';
import { HDNodeWallet, Mnemonic } from 'ethers';
import { TonClient, WalletContractV4, WalletContractV5R1, HighloadWalletContractV2 } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';

window.Buffer = Buffer;

let masterTrackingV5Address = null;

const masterTonRpcClient = new TonClient({
    endpoint: 'https://toncenter.com/api/v2/jsonRPC'
});

function writeLogStream(text, level = 'info') {
    const logBox = document.getElementById('masterLogStream');
    if (!logBox) return;
    const line = document.createElement('div');
    line.className = `log-entry log-${level}`;
    const time = new Date().toLocaleTimeString();
    line.innerText = `[${time}] ${text}`;
    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;
}

// Generate Seed
document.getElementById('runGenSeed').addEventListener('click', () => {
    try {
        const mnemonic = bip39.generateMnemonic(256);
        document.getElementById('walletSeedInput').value = mnemonic;
        writeLogStream("✅ New 24-word secure mnemonic generated", "success");
    } catch (err) {
        writeLogStream(`Generation failed: ${err.message}`, "error");
    }
});

// Derive All Wallets
document.getElementById('runLoadEcosystem').addEventListener('click', async () => {
    const input = document.getElementById('walletSeedInput').value.trim();
    const words = input.split(/\s+/).filter(w => w.length > 0);

    if (words.length !== 12 && words.length !== 24) {
        writeLogStream(`Invalid word count: ${words.length} (must be 12 or 24)`, "error");
        alert("Seed must be 12 or 24 words.");
        return;
    }

    const mnemonicPhrase = words.join(' ');

    if (!bip39.validateMnemonic(mnemonicPhrase)) {
        writeLogStream("❌ Invalid mnemonic checksum", "error");
        alert("Invalid mnemonic.");
        return;
    }

    writeLogStream("✅ Mnemonic validated. Deriving addresses...", "success");

    try {
        // TON
        const keyPair = await mnemonicToPrivateKey(words);

        const v5 = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });
        const v4 = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
        const hl = HighloadWalletContractV2.create({ workchain: 0, publicKey: keyPair.publicKey });

        masterTrackingV5Address = v5.address;

        document.getElementById('tonOutV5NB').innerText = v5.address.toString({ bounceable: false, urlSafe: true });
        document.getElementById('tonOutV5B').innerText = v5.address.toString({ bounceable: true, urlSafe: true });
        document.getElementById('tonOutV4NB').innerText = v4.address.toString({ bounceable: false, urlSafe: true });
        document.getElementById('tonOutHLNB').innerText = hl.address.toString({ bounceable: false, urlSafe: true });
        document.getElementById('tonOutRaw').innerText = v5.address.toRawString();

        writeLogStream("✅ TON addresses derived successfully", "success");

        // EVM
        const ethersMnemonic = Mnemonic.fromPhrase(mnemonicPhrase);
        const hdNode = HDNodeWallet.fromMnemonic(ethersMnemonic);
        const ethWallet = hdNode.derivePath("m/44'/60'/0'/0/0");

        document.getElementById('ethAddressOut').innerText = ethWallet.address;
        document.getElementById('l2AddressOut').innerText = ethWallet.address;
        writeLogStream("✅ EVM address derived", "success");

        // TRON
        const tronNode = hdNode.derivePath("m/44'/195'/0'/0/0");
        const tronAddr = "T" + tronNode.address.replace('0x', '').slice(0, 32) + "...";
        document.getElementById('tronAddressOut').innerText = tronAddr;
        writeLogStream("✅ TRON address derived", "success");

    } catch (err) {
        console.error(err);
        writeLogStream(`❌ Error: ${err.message}`, "error");
    }
});

// Query Balance
document.getElementById('runQueryNode').addEventListener('click', async () => {
    if (!masterTrackingV5Address) {
        writeLogStream("Please derive wallet first", "error");
        return;
    }

    writeLogStream("Querying TON mainnet balance...");

    try {
        const state = await masterTonRpcClient.getContractState(masterTrackingV5Address);
        const balanceTON = (Number(state.balance) / 1_000_000_000).toFixed(4);

        document.getElementById('telemetryBalance').innerText = `${balanceTON} TON`;
        document.getElementById('telemetryStatus').innerText = `Active • ${state.state || 'unknown'}`;

        writeLogStream(`✅ Balance fetched: ${balanceTON} TON`, "success");
    } catch (err) {
        console.error(err);
        writeLogStream(`RPC Error: ${err.message}`, "error");
    }
});
