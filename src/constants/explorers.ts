export interface ExplorerInfo {
    name: string;
    url: string;
    txPath: string;
    accountPath: string;
  }
  
  export const EXPLORERS: ExplorerInfo[] = [
    {
      name: 'Solana Explorer',
      url: 'https://explorer.solana.com',
      txPath: '/tx',
      accountPath: '/address'
    },
    {
      name: 'Solscan',
      url: 'https://solscan.io',
      txPath: '/tx',
      accountPath: '/account'
    },
    {
      name: 'SolanaFM',
      url: 'https://solana.fm',
      txPath: '/tx',
      accountPath: '/address'
    }
  ];
