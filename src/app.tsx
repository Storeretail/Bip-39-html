import { useState, useEffect, useCallback } from 'react';
import { mnemonicNew, mnemonicToPrivateKey, mnemonicValidate } from '@ton/crypto';
import { WalletContractV4, WalletContractV5R1, TonClient, internal, Address, toNano, OpenedContract } from '@ton/ton';
import { useTonConnectUI, useTonWallet, TonConnectUI } from '@tonconnect/ui-react';
import QRCode from 'qrcode';
import { Buffer } from 'buffer';

window.Buffer = Buffer;

type Network = 'mainnet' | 'testnet';

const clientMain = new TonClient({ endpoint: 'https://toncenter.mytonwallet.org/api/v2/jsonRPC' });
const clientTest = new TonClient({ endpoint: 'https://toncenter-testnet.mytonwallet.org/api/v2/jsonRPC' });

export default function App() {
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [addresses, setAddresses] = useState<{ v4: string; v5: string; raw: string } | null>(null);
  const [balance, setBalance] = useState('0');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [network, setNetwork] = useState<Network>('mainnet');
  const [qrCode, setQrCode] = useState('');
  const [importedMnemonic, setImportedMnemonic] = useState('');

  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();

  const client = network === 'mainnet' ? clientMain : clientTest;

  const showMessage = (type: 'success' | 'error' | 'info', message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 8000);
  };

  // Create New Wallet
  const createWallet = async () => {
    setLoading(true);
    try {
      const mnemo = await mnemonicNew(24);
      setMnemonic(mnemo);

      const keyPair = await mnemonicToPrivateKey(mnemo);

      const v4 = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
      const v5 = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });

      const v4Addr = v4.address.toString({ testOnly: false, bounceable: true });
      const v5Addr = v5.address.toString({ testOnly: false, bounceable: true });

      const newAddresses = { v4: v4Addr, v5: v5Addr, raw: v4.address.toRawString() };
      setAddresses(newAddresses);

      // Generate QR
      const qr = await QRCode.toDataURL(v5Addr);
      setQrCode(qr);

      showMessage('success', 'Wallet created successfully! Backup your mnemonic immediately.');
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  // Import from Mnemonic
  const importWallet = async () => {
    if (!importedMnemonic.trim()) return;
    const words = importedMnemonic.trim().split(/\s+/);
    if (words.length !== 24 && words.length !== 12) {
      showMessage('error', 'Mnemonic must be 12 or 24 words');
      return;
    }
    if (!(await mnemonicValidate(words))) {
      showMessage('error', 'Invalid mnemonic');
      return;
    }

    setMnemonic(words);
    // Same derivation logic as createWallet...
    const keyPair = await mnemonicToPrivateKey(words);
    const v4 = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    const v5 = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });

    const v4Addr = v4.address.toString({ testOnly: false, bounceable: true });
    const v5Addr = v5.address.toString({ testOnly: false, bounceable: true });

    setAddresses({ v4: v4Addr, v5: v5Addr, raw: v4.address.toRawString() });
    const qr = await QRCode.toDataURL(v5Addr);
    setQrCode(qr);

    showMessage('success', 'Wallet imported successfully');
  };

  // Fetch Balance
  const fetchBalance = useCallback(async (addr: string) => {
    try {
      const bal = await client.getBalance(Address.parse(addr));
      setBalance((Number(bal) / 1_000_000_000).toFixed(4));
    } catch (e) {
      console.error(e);
    }
  }, [client]);

  useEffect(() => {
    if (addresses?.v5) fetchBalance(addresses.v5);
  }, [addresses, fetchBalance]);

  // Send TON
  const sendTon = async () => {
    if (!wallet || !recipient || !amount) {
      showMessage('error', 'Please fill all fields and connect wallet');
      return;
    }
    setLoading(true);
    try {
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [{
          address: recipient,
          amount: toNano(amount).toString(),
        }]
      });
      showMessage('success', 'Transaction sent successfully!');
      setRecipient('');
      setAmount('');
    } catch (err: any) {
      showMessage('error', err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">My TON Wallet</h1>
          <div className="flex gap-4">
            <select value={network} onChange={(e) => setNetwork(e.target.value as Network)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2">
              <option value="mainnet">Mainnet</option>
              <option value="testnet">Testnet</option>
            </select>
            <TonConnectButton />
          </div>
        </div>

        {/* Status */}
        {status && (
          <div className={`p-4 rounded-xl mb-6 ${status.type === 'success' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
            {status.message}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Wallet Creation / Import */}
          <div className="space-y-6">
            <button
              onClick={createWallet}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-2xl disabled:opacity-70"
            >
              {loading ? 'Creating...' : 'Create New 24-word Wallet'}
            </button>

            <div className="space-y-3">
              <textarea
                value={importedMnemonic}
                onChange={(e) => setImportedMnemonic(e.target.value)}
                placeholder="Paste 12 or 24 word mnemonic here..."
                className="w-full h-32 p-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl"
              />
              <button onClick={importWallet} className="w-full bg-gray-800 hover:bg-gray-900 text-white py-3 rounded-2xl">
                Import from Mnemonic
              </button>
            </div>
          </div>

          {/* Wallet Info */}
          {addresses && (
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-lg mb-4">Your Addresses</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-gray-500">V5R1 (Recommended)</p>
                  <p className="font-mono break-all">{addresses.v5}</p>
                </div>
                <div>
                  <p className="text-gray-500">V4</p>
                  <p className="font-mono break-all">{addresses.v4}</p>
                </div>
                <p className="font-semibold">Balance: <span className="text-green-600">{balance} TON</span></p>
              </div>

              {qrCode && (
                <div className="mt-6 flex justify-center">
                  <img src={qrCode} alt="QR Code" className="rounded-xl" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Send Section */}
        {wallet && (
          <div className="mt-10 bg-white dark:bg-gray-900 p-8 rounded-3xl border">
            <h3 className="text-2xl font-semibold mb-6">Send TON</h3>
            <input type="text" placeholder="Recipient Address" value={recipient} onChange={e => setRecipient(e.target.value)}
              className="w-full mb-4 p-4 rounded-2xl border dark:bg-gray-800" />
            <input type="text" placeholder="Amount in TON" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full mb-6 p-4 rounded-2xl border dark:bg-gray-800" />
            <button
              onClick={sendTon}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-2xl text-white font-semibold text-lg"
            >
              {loading ? 'Sending...' : 'Send Transaction'}
            </button>
          </div>
        )}

        <div className="mt-12 text-center text-sm text-gray-500">
          ⚠️ This is a hot wallet for small amounts only. Always backup your mnemonic offline.
          Never share your seed phrase.
        </div>
      </div>
    </div>
  );
}
