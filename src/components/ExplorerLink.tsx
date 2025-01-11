import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { ContextType } from '../types';
import { EXPLORERS, type ExplorerInfo } from '../constants/explorers';

interface ExplorerLinkProps {
  type: 'tx' | 'address';
  value: string;
  children: ReactNode;
}

export const ExplorerLink = ({ type, value, children }: ExplorerLinkProps) => {
  const { selectedNetwork } = useOutletContext<ContextType>();
  const [explorer, setExplorer] = useState<ExplorerInfo>(EXPLORERS[0]);

  useEffect(() => {
    const savedExplorer = localStorage.getItem('preferredExplorer');
    if (savedExplorer) {
      const found = EXPLORERS.find(e => e.name === savedExplorer);
      if (found) setExplorer(found);
    }
  }, []);

  // Use network explorer URL if specified, otherwise use preferred explorer
  const baseUrl = selectedNetwork.explorerUrl || explorer.url;
  const path = type === 'tx' ? explorer.txPath : explorer.accountPath;
  
  return (
    <a
      href={`${baseUrl}${path}/${value}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#39ff14] hover:text-[#39ff14]/80"
    >
      {children}
    </a>
  );
};