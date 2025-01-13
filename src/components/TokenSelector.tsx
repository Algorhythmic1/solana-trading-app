import { useState, useEffect, useMemo } from 'react';
import type { JupiterToken } from '../types';

interface TokenSelectorProps {
  onSelect: (token: JupiterToken) => void;
  value?: JupiterToken;
  placeholder?: string;
}

export const TokenSelector = ({ onSelect, placeholder = "Search tokens..." }: TokenSelectorProps) => {
  const [tokens, setTokens] = useState<JupiterToken[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTokens = async () => {
      setLoading(true);
      try {
        const response = await fetch('https://token.jup.ag/all');
        const data = await response.json();
        setTokens(data);
      } catch (error) {
        console.error('Failed to fetch tokens:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, []);

  const filteredTokens = useMemo(() => {
    const searchLower = search.toLowerCase();
    return tokens.filter(token => 
      token.symbol.toLowerCase().includes(searchLower) ||
      token.name.toLowerCase().includes(searchLower) ||
      token.address.toLowerCase().includes(searchLower)
    );
  }, [tokens, search]);

  return (
    <div className="relative w-full">
      <div 
        className="cyberpunk w-full cursor-pointer"
        onClick={() => setIsOpen(true)}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent border-none focus:outline-none"
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 max-h-60 overflow-auto cyberpunk bg-sol-background">
            {loading ? (
              <div className="p-2 text-sol-text">Loading tokens...</div>
            ) : filteredTokens.length === 0 ? (
              <div className="p-2 text-sol-text">No tokens found</div>
            ) : (
              filteredTokens.map(token => (
                <div
                  key={token.address}
                  className="flex items-center gap-2 p-2 hover:bg-sol-card cursor-pointer"
                  onClick={() => {
                    onSelect(token);
                    setSearch('');
                    setIsOpen(false);
                  }}
                >
                  {token.logoURI && (
                    <img 
                      src={token.logoURI} 
                      alt={token.symbol}
                      className="w-6 h-6 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/token-placeholder.png';
                      }}
                    />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sol-green font-bold">{token.symbol}</span>
                    <span className="text-sol-text text-sm">{token.name}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}; 