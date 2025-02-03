export interface ExplorerInfo {
    name: string;
    url: string;
    txPath: string;
    accountPath: string;
    networkParam: string;
  }
  
  export const EXPLORERS: ExplorerInfo[] = [
    {
      name: 'Solana Explorer',
      url: 'https://explorer.solana.com',
      txPath: '/tx',
      accountPath: '/address',
      networkParam: '?cluster='
    },
    {
      name: 'Solscan',
      url: 'https://solscan.io',
      txPath: '/tx',
      accountPath: '/account',
      networkParam: '?cluster='
    },
    {
      name: 'SolanaFM',
      url: 'https://solana.fm',
      txPath: '/tx',
      accountPath: '/address',
      networkParam: '?cluster='
    }
  ];