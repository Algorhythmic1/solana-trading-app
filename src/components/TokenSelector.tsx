import { useState, useEffect } from 'react';
import type { JupiterToken } from '../types';
import { searchTokensByAny } from '../utils/tokenQueryUtils';
import { getValidImageUrl } from '../utils/tokenImage';

interface TokenSelectorProps {
  onSelect: (token: JupiterToken) => void;
  value?: JupiterToken;
  placeholder?: string;
}

const NATIVE_SOL_TOKEN: JupiterToken = {
  address: 'native', // Special case to identify native SOL
  symbol: 'SOL',
  name: 'Solana',
  decimals: 9,
  logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
  chainId: 101,
  tags: undefined
};

const WSOL_MINT = 'So11111111111111111111111111ß111111111111112';

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
        setTokens([NATIVE_SOL_TOKEN]);
        return;
      }

      setLoading(true);
      try {
        const results = await searchTokensByAny(search);
        // Filter out wSOL from search results since we handle it specially
        const filteredResults = results.filter(token => token.address !== WSOL_MINT);
        // If "sol" is in the search, show native SOL first
        if (search.toLowerCase().includes('sol')) {
          setTokens([NATIVE_SOL_TOKEN, ...filteredResults]);
        } else {
          setTokens(filteredResults);
        }
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
      onSelect({} as JupiterToken); // Clear selection
      setSearch('');
    }
    setIsOpen(true);
  };

  const handleTokenSelect = (token: JupiterToken) => {
    console.log('TokenSelector - handleTokenSelect called with:', token);
    onSelect(token);
    setSearch('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      <div 
        className="cyberpunk w-full bg-[var(--sol-background)] cursor-pointer flex items-center gap-3 p-2"
        onClick={handleSelectorClick}
      >
        {value?.symbol ? (
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
            className="w-full bg-sol-card text-[var(--sol-text)] focus:outline-none rounded px-2"
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
                  onClick={() => handleTokenSelect(token)}
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