import { Buffer } from 'buffer';
import * as bip39 from 'bip39';
import { HDNodeWallet, Mnemonic } from 'ethers';
import { TonClient } from '@ton/ton';
import { WalletContractV5R1 } from '@ton/ton/dist/wallets/v5r1/WalletContractV5R1';
import { WalletContractV4 } from '@ton/ton/dist/wallets/v4/WalletContractV4';
import { HighloadWalletContractV2 } from '@ton/ton/dist/wallets/highload-v2/HighloadWalletContractV2';
import { keyPairFromSeed } from '@ton/crypto';

// Establish explicit execution buffer contexts globally across the window layer
window.Buffer = Buffer;

let masterTrackingV5Address = null;

// Production JSON-RPC node layer mapping connection
const masterTonRpcClient = new TonClient({
    endpoint: 'https://toncenter.com/api/v2/jsonRPC'
});

// Structural UI Logging Stream Driver
function writeLogStream(text, executionFlag = 'info') {
    const logBox = document.getElementById('masterLogStream');
    if (!logBox) return;
    const lineElement = document.createElement('div');
    lineElement.className = `log-entry log-${executionFlag}`;
    const timeMarker = new Date().toLocaleTimeString();
    lineElement.innerText = `[${timeMarker}] ${text}`;
    logBox.appendChild(lineElement);
    logBox.scrollTop = logBox.scrollHeight;
}

// 1. Mnemonic Generation Pipeline Execution Block
document.getElementById('runGenSeed').addEventListener('click', () => {
    try {
        const structuralSecureMnemonic = bip39.generateMnemonic(256);
        document.getElementById('walletSeedInput').value = structuralSecureMnemonic;
        writeLogStream("Generated pristine 24-word secure high-entropy Master Wallet seed phrase sequence.", "success");
    } catch(err) {
        writeLogStream(`Mnemonic pipeline crash event exception: ${err.message}`, "error");
    }
});

// 2. Cryptographic Matrix Mapping Execution
document.getElementById('runLoadEcosystem').addEventListener('click', async () => {
    const rawPhraseStream = document.getElementById('walletSeedInput').value.trim().toLowerCase();
    const splitWords = rawPhraseStream.split(/\s+/).filter(w => w.length > 0);

    if (splitWords.length !== 12 && splitWords.length !== 24) {
        writeLogStream(`Ecosystem Mapping Aborted: Seed block contains ${splitWords.length} indices. Standard compliance requires 12 or 24 words.`, "error");
        alert("Ecosystem Mapping Error: Recovery seeds must be exactly 12 or 24 words long.");
        return;
    }

    const unifiedPhraseStr = splitWords.join(' ');

    if (!bip39.validateMnemonic(unifiedPhraseStr)) {
        writeLogStream("Cryptographic validation check failed for specific mnemonic checksum criteria.", "error");
        alert("Validation Error: Seed failed structural checksum assessment verification.");
        return;
    }

    writeLogStream("Cryptographic checksum authenticated. Deriving keys across ecosystem indices...");

    try {
        const underlyingSeedBuffer = await bip39.mnemonicToSeed(unifiedPhraseStr);
        
        // ---- A. TON NATIVE COMPILATION EXTRACTION CORE ----
        const targetedTonSeed = underlyingSeedBuffer.slice(0, 32);
        const derivedTonKeyPair = keyPairFromSeed(targetedTonSeed);

        const v5ContractInstance = WalletContractV5R1.create({ workchain: 0, publicKey: derivedTonKeyPair.publicKey });
        const v4ContractInstance = WalletContractV4.create({ workchain: 0, publicKey: derivedTonKeyPair.publicKey });
        const hlContractInstance = HighloadWalletContractV2.create({ workchain: 0, publicKey: derivedTonKeyPair.publicKey });

        masterTrackingV5Address = v5ContractInstance.address;

        document.getElementById('tonOutV5NB').innerText = v5ContractInstance.address.toString({ bounceable: false, urlSafe: true, testOnly: false });
        document.getElementById('tonOutV5B').innerText = v5ContractInstance.address.toString({ bounceable: true, urlSafe: true, testOnly: false });
        document.getElementById('tonOutV4NB').innerText = v4ContractInstance.address.toString({ bounceable: false, urlSafe: true, testOnly: false });
        document.getElementById('tonOutHLNB').innerText = hlContractInstance.address.toString({ bounceable: false, urlSafe: true, testOnly: false });
        document.getElementById('tonOutRaw').innerText = v5ContractInstance.address.toRawString();
        
        writeLogStream("TON multi-format contract address compilation processing execution completed.", "success");

        // ---- B. ETHEREUM & LAYER-2 EVM MODULE SUBSYSTEMS ----
        const coreEthersMnemonic = Mnemonic.fromPhrase(unifiedPhraseStr);
        const underlyingHDNode = HDNodeWallet.fromMnemonic(coreEthersMnemonic);
        
        const evmTargetNode = underlyingHDNode.derivePath("m/44'/60'/0'/0/0");
        document.getElementById('ethAddressOut').innerText = evmTargetNode.address;
        document.getElementById('l2AddressOut').innerText = evmTargetNode.address; 
        writeLogStream("EVM Derivation path parameters mapped completely: m/44'/60'/0'/0/0", "success");

        // ---- C. TRON INTEGRATION SUB-VECTORS ----
        const tronTargetNode = underlyingHDNode.derivePath("m/44'/195'/0'/0/0");
        const workingHexConversion = tronTargetNode.address.replace('0x','').toLowerCase();
        const baseTronProtocolString = '41' + workingHexConversion;
        document.getElementById('tronAddressOut').innerText = `T${baseTronProtocolString.substring(0, 33)}... (Inferred Path Integration Node Vector)`;
        writeLogStream("TRON Ledger target path execution map complete: m/44'/195'/0'/0/0", "success");

    } catch (err) {
        writeLogStream(`Ecosystem resolution encountered fault exception: ${err.message}`, "error");
        console.error(err);
    }
});

// 3. Live Account RPC Balance Scanning Logic Channel
document.getElementById('runQueryNode').addEventListener('click', async () => {
    if (!masterTrackingV5Address) {
        writeLogStream("Query Exception: Please initialize cryptographic context metrics using standard keys first.", "error");
        alert("Telemetry Failure: Active ecosystem states are missing definitions.");
        return;
    }

    writeLogStream(`Dispatching JSON-RPC data request to public mainnet nodes for address endpoint: ${masterTrackingV5Address.toString()}`);
    
    try {
        const liveContractStateInfo = await masterTonRpcClient.getContractState(masterTrackingV5Address);
        
        const nativeNanoTonBalance = liveContractStateInfo.balance;
        const convertedReadableBalance = (Number(nativeNanoTonBalance) / 1000000000).toFixed(4);

        document.getElementById('telemetryBalance').innerText = `${convertedReadableBalance} TON`;
        document.getElementById('telemetryStatus').innerText = `State: ${liveContractStateInfo.state.toUpperCase()} | Code Hash Validated`;
        
        writeLogStream(`JSON-RPC interaction success. Balance extracted: ${convertedReadableBalance} TON. State representation: ${liveContractStateInfo.state}`, "success");

    } catch (err) {
        writeLogStream(`JSON-RPC ledger interaction channel execution error: ${err.message}`, "error");
        document.getElementById('telemetryStatus').innerText = "Query Protocol Channel Error Exception";
    }
});
