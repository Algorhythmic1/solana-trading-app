import { EXPLORERS } from '../constants/explorers';
import type { NetworkInfo } from '../types';

export function getExplorerUrl(
  type: 'tx' | 'address', 
  value: string, 
  network?: NetworkInfo
): string {
  // Use network explorer if specified
  if (network?.explorerUrl) {
    const path = type === 'tx' ? '/tx' : '/address';
    return `${network.explorerUrl}${path}/${value}`;
  }

  // Otherwise use preferred explorer
  const savedExplorer = localStorage.getItem('preferredExplorer');
  const explorer = savedExplorer 
    ? EXPLORERS.find(e => e.name === savedExplorer) 
    : EXPLORERS[0];

  if (!explorer) return EXPLORERS[0].url;

  const path = type === 'tx' ? explorer.txPath : explorer.accountPath;
  return `${explorer.url}${path}/${value}`;
}