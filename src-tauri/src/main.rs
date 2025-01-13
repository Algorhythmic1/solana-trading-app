mod keyring;
mod token_utils;

use keyring::{save_to_keyring, load_from_keyring, list_stored_wallets};
use token_utils::{get_all_tokens, search_tokens_with_address, search_tokens_with_name};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            save_to_keyring,
            load_from_keyring,
            list_stored_wallets,
            get_all_tokens,
            search_tokens_with_address,
            search_tokens_with_name,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}