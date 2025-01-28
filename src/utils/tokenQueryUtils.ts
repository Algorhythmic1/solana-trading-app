import { invoke } from '@tauri-apps/api/core';
import type { JupiterToken } from '../types';

export async function getAllTokens(): Promise<JupiterToken[]> {
  try {
    return await invoke<JupiterToken[]>('get_all_tokens');
  } catch (error) {
    console.error('Failed to fetch all tokens:', error);
    throw error;
  }
}

export async function searchTokensByAddress(address: string): Promise<JupiterToken[]> {
  try {
    return await invoke<JupiterToken[]>('search_tokens_with_address', { query: address });
  } catch (error) {
    console.error('Failed to search tokens by address:', error);
    throw error;
  }
}

export async function searchTokensByName(name: string): Promise<JupiterToken[]> {
  try {
    return await invoke<JupiterToken[]>('search_tokens_with_name', { query: name });
  } catch (error) {
    console.error('Failed to search tokens by name:', error);
    throw error;
  }
}

export async function searchTokensByAny(query: string): Promise<JupiterToken[]> {
  try {
    return await invoke<JupiterToken[]>('search_tokens_with_any', { query });
  } catch (error) {
    console.error('Failed to search tokens by any:', error);
    throw error;
  }
}