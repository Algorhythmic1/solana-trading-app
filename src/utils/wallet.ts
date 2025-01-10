import { Keypair } from '@solana/web3.js';
import { invoke } from '@tauri-apps/api/core';
import base58 from 'bs58';

export const saveWalletToKeyring = async (keypair: Keypair) => {
  try {
    const secretKeyString = base58.encode(keypair.secretKey);
    console.log('Attempting to save to keyring:', secretKeyString.slice(0, 10) + '...');
    await invoke('save_to_keyring', { key: secretKeyString });
    console.log('Successfully saved to keyring');
  } catch (error) {
    console.error('Failed to save to keyring:', error);
    throw error;
  }
};

export const loadWalletFromKeyring = async (): Promise<Keypair | null> => {
  try {
    console.log('Attempting to load from keyring...');
    const secretKeyString = await invoke<string>('load_from_keyring');
    console.log('Got key from keyring:', secretKeyString.slice(0, 10) + '...');
    const secretKey = base58.decode(secretKeyString);
    console.log('Decoded key length:', secretKey.length);
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.log('Error loading from keyring:', error);
    return null;
  }
};