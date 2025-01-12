mod keyring;

use keyring::{save_to_keyring, load_from_keyring, list_stored_wallets};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            save_to_keyring,
            load_from_keyring,
            list_stored_wallets
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}