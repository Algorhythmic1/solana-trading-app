import { ReactNode } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ContextType } from '../types';

interface ExplorerLinkProps {
  type: 'tx' | 'address';
  value: string;
  children: ReactNode;
}

export const ExplorerLink = ({ type, value, children }: ExplorerLinkProps) => {
  const { selectedNetwork } = useOutletContext<ContextType>();
  const baseUrl = selectedNetwork.explorerUrl || 'https://explorer.solana.com';
  const path = type === 'tx' ? 'tx' : 'address';
  
  return (
    <a
      href={`${baseUrl}/${path}/${value}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#39ff14] hover:text-[#39ff14]/80"
    >
      {children}
    </a>
  );
};