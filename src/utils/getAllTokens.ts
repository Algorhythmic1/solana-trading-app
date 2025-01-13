import { invoke } from '@tauri-apps/api/core';

export interface Token {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI?: string;
  tags?: string[];
}

export async function getAllTokens(): Promise<Token[]> {
  try {
    return await invoke<Token[]>('get_all_tokens');
  } catch (error) {
    console.error('Failed to fetch all tokens:', error);
    throw error;
  }
}

export async function searchTokensByAddress(address: string): Promise<Token[]> {
  try {
    return await invoke<Token[]>('search_tokens_with_address', { query: address });
  } catch (error) {
    console.error('Failed to search tokens by address:', error);
    throw error;
  }
}

export async function searchTokensByName(name: string): Promise<Token[]> {
  try {
    return await invoke<Token[]>('search_tokens_with_name', { query: name });
  } catch (error) {
    console.error('Failed to search tokens by name:', error);
    throw error;
  }
}