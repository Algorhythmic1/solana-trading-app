# SOL Edge Browser

<img src="/src-tauri/icons/Square107x107Logo.png" alt="SOL Edge Browser" width="100" height="100">

This app contains some simple utilities for interacting with the Solana blockchain. It is built with Tauri, React, and Typescript, and is intended to be used as a desktop app.

It has been tested on MacOS and Windows 11. There are bugs with IPC permissions on Linux outstanding the current version but it is intended to be fully cross-platform (eventually).

To get started, clone the repository and run `pnpm install`. Then run `pnpm tauri dev` to start the development environment. 

For testing, input a private key in base58 format (you can export one from Phantom Wallet). This will be stored on your local machine using the default system keychain. To work on mainnet, you'll need to supply an RPC API key, which can be set on the settings page. Transactions are very unlikely to succeed on mainnet using the default settings. You can get a free API key from Helius by connecting your GitHub account.

The app is very alpha stage right now with numerous bugs but is functional.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
