import { EXPLORERS } from '../constants/explorers';

export function getExplorerUrl(type: 'tx' | 'address', value: string): string {
  const savedExplorer = localStorage.getItem('preferredExplorer');
  const explorer = savedExplorer 
    ? EXPLORERS.find(e => e.name === savedExplorer) 
    : EXPLORERS[0];

  if (!explorer) return EXPLORERS[0].url;

  const path = type === 'tx' ? explorer.txPath : explorer.accountPath;
  return `${explorer.url}${path}/${value}`;
}