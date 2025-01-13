import { useState, useEffect } from 'react';
import type { JupiterToken } from '../types';
import { searchTokensByAny } from '../utils/getAllTokens';
import { getValidImageUrl } from '../utils/tokenImage';

interface TokenSelectorProps {
  onSelect: (token: JupiterToken) => void;
  value?: JupiterToken;
  placeholder?: string;
}

export const TokenSelector = ({ onSelect, value, placeholder = "Search tokens..." }: TokenSelectorProps) => {
  const [tokens, setTokens] = useState<JupiterToken[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const TokenImage = ({ token }: { token: JupiterToken }) => {
    const [imageError, setImageError] = useState(false);
    const imageUrl = getValidImageUrl(token?.logoURI);

    if (!token?.symbol || imageError) {
      return (
        <div className="w-8 h-8 bg-sol-card rounded-full flex items-center justify-center">
          <span className="text-sm text-sol-green">{token?.symbol?.[0] || '?'}</span>
        </div>
      );
    }

    return (
      <img
        src={imageUrl}
        alt={token.symbol}
        className="w-8 h-8 rounded-full"
        onError={() => setImageError(true)}
      />
    );
  };

  // Search tokens when input changes
  useEffect(() => {
    const searchTokens = async () => {
      if (!search) {
        setTokens([]);
        return;
      }

      setLoading(true);
      try {
        const results = await searchTokensByAny(search);
        setTokens(results);
      } catch (error) {
        console.error('Failed to search tokens:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchTokens, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const handleSelectorClick = () => {
    if (value) {
      onSelect({} as JupiterToken);
      setSearch('');
    }
    setIsOpen(true);
  };

  return (
    <div className="relative w-full">
      <div 
        className="cyberpunk w-full bg-[var(--sol-background)] cursor-pointer flex items-center gap-3 p-2"
        onClick={handleSelectorClick}
      >
        {value ? (
          <div className="flex items-center gap-3">
            <TokenImage token={value} />
            <span className="text-sol-green text-lg font-medium">{value.symbol}</span>
          </div>
        ) : (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full border-[var(--sol-green)] text-[var(--sol-text)] focus:outline-none"
            onFocus={() => setIsOpen(true)}
          />
        )}
      </div>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bg-[var(--sol-background)] z-20 w-full mt-1 max-h-60 overflow-auto cyberpunk">
            {loading ? (
              <div className="p-2 text-sol-text">Loading tokens...</div>
            ) : tokens.length === 0 ? (
              <div className="p-2 text-sol-green">
                {search ? 'No tokens found' : 'Type to search tokens'}
              </div>
            ) : (
              tokens.map(token => (
                <div
                  key={token.address}
                  className="flex items-center gap-3 p-3 hover:bg-sol-card cursor-pointer"
                  onClick={() => {
                    onSelect(token);
                    setSearch('');
                    setIsOpen(false);
                  }}
                >
                  <TokenImage token={token} />
                  <div className="flex flex-col">
                    <span className="text-sol-green font-bold text-base">{token.symbol}</span>
                    <span className="text-[var(--sol-text2)] text-sm">{token.name}</span>
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