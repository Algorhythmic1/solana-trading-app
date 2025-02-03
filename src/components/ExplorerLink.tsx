import { open } from '@tauri-apps/plugin-shell'
import { useOutletContext } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { ContextType } from '../types';
import { EXPLORERS } from '../constants/explorers';

interface ExplorerLinkProps {
  type: 'tx' | 'address';
  value: string;
  children: ReactNode;
}

export const ExplorerLink = ({ type, value, children }: ExplorerLinkProps) => {
  const { selectedNetwork } = useOutletContext<ContextType>();


  const explorer = (() => {
    const savedExplorer = localStorage.getItem('preferredExplorer');
    if (savedExplorer) {
      const found = EXPLORERS.find(e => e.name === savedExplorer);
      if (found) return found;
    }
    return EXPLORERS[0];
  })();

  // Use network explorer URL if specified, otherwise use preferred explorer
  const baseUrl = explorer.url;
  const path = type === 'tx' ? explorer.txPath : explorer.accountPath;
  const networkParam = selectedNetwork.name === 'mainnet-beta' 
  ? '' 
  : explorer.networkParam + selectedNetwork.name;


  return (
    <a
      href={``}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => open(`${baseUrl}${path}/${value}${networkParam}`)}
      className="text-[#39ff14] hover:text-[#39ff14]/80"
    >
      {children}
    </a>
  );
};