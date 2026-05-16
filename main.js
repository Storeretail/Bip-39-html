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

function log(text, type = 'info') {
    const el = document.getElementById('masterLogStream');
    const entry = document.createElement('div');
    entry.style.marginBottom = '6px';
    if (type === 'success') entry.style.color = '#10b981';
    if (type === 'error') entry.style.color = '#ef4444';
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    el.appendChild(entry);
    el.scrollTop = el.scrollHeight;
}

// Generate Seed
document.getElementById('runGenSeed').addEventListener('click', () => {
    const mnemonic = bip39.generateMnemonic(256);
    document.getElementById('walletSeedInput').value = mnemonic;
    log("✅ 24-word seed generated", "success");
});

// Derive Addresses
document.getElementById('runLoadEcosystem').addEventListener('click', async () => {
    const input = document.getElementById('walletSeedInput').value.trim();
    const words = input.split(/\s+/).filter(Boolean);

    if (words.length !== 12 && words.length !== 24) {
        log("❌ Seed must be 12 or 24 words", "error");
        return;
    }

    log("Deriving addresses...");

    try {
        const keyPair = await mnemonicToPrivateKey(words);

        const v5 = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });
        document.getElementById('tonOutV5NB').textContent = v5.address.toString({ bounceable: false, urlSafe: true });
        document.getElementById('tonOutV5B').textContent = v5.address.toString({ bounceable: true, urlSafe: true });
        document.getElementById('tonOutV4NB').textContent = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }).address.toString({ bounceable: false, urlSafe: true });

        const ethMnemonic = Mnemonic.fromPhrase(words.join(' '));
        const hd = HDNodeWallet.fromMnemonic(ethMnemonic);
        document.getElementById('ethAddressOut').textContent = hd.derivePath("m/44'/60'/0'/0/0").address;

        document.getElementById('tronAddressOut').textContent = "T" + hd.derivePath("m/44'/195'/0'/0/0").address.replace('0x','').slice(0,34);

        masterV5Address = v5.address;
        log("✅ All addresses derived successfully", "success");
    } catch (err) {
        log("❌ Error: " + err.message, "error");
        console.error(err);
    }
});

// Query Balance
document.getElementById('runQueryNode').addEventListener('click', async () => {
    if (!masterV5Address) return log("Please derive wallet first", "error");

    try {
        const state = await tonClient.getContractState(masterV5Address);
        const balance = (Number(state.balance) / 1_000_000_000).toFixed(4);
        document.getElementById('telemetryBalance').textContent = `${balance} TON`;
        log(`✅ Balance: ${balance} TON`, "success");
    } catch (err) {
        log("❌ Balance query failed", "error");
    }
});
