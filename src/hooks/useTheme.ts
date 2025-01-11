import { useState, useEffect } from 'react';

export type ThemeName = 'cyberpunk' | 'solana' | 'matrix';

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeName>(() => 
    (localStorage.getItem('preferredTheme') as ThemeName) || 'cyberpunk'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('preferredTheme', theme);
  }, [theme]);

  return { theme, setTheme };
};