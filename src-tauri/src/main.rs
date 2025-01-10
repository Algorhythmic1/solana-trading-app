// TODO: Current implementation uses macOS-specific security-framework
// This is a temporary solution that works reliably on macOS but needs to be
// replaced with a cross-platform solution. Original attempt with the `keyring`
// crate failed to persist keys (possibly due to permissions/implementation issues).
// Future work needed:
// 1. Investigate why `keyring` crate isn't working
// 2. Implement proper cross-platform support using conditional compilation
// 3. Test on Windows and Linux

use security_framework::passwords::{set_generic_password, get_generic_password };
use serde::Serialize;
use solana_sdk::signer::{keypair::Keypair, Signer};
use bs58;

#[derive(Debug, Serialize)]
struct KeyringError {
    message: String,
}

impl From<security_framework::base::Error> for KeyringError {
    fn from(error: security_framework::base::Error) -> Self {
        KeyringError {
            message: error.to_string(),
        }
    }
}

const SERVICE_NAME: &str = "com.tradingapp.dev";
const ACCOUNT_NAME: &str = "wallet-key";

#[tauri::command]
async fn save_to_keyring(key: String) -> Result<(), KeyringError> {
    println!("Rust: Attempting to save to keyring with service: {}", SERVICE_NAME);
    
    set_generic_password(
        SERVICE_NAME,
        ACCOUNT_NAME,
        key.as_bytes()
    )?;
    
    println!("Rust: Successfully saved to keychain");
    Ok(())
}

#[tauri::command]
async fn load_from_keyring() -> Result<String, KeyringError> {
    println!("Rust: Attempting to load from keyring with service: {}", SERVICE_NAME);
    
    match get_generic_password(SERVICE_NAME, ACCOUNT_NAME) {
        Ok(password) => {
            let password_str = String::from_utf8(password)
                .map_err(|e| KeyringError { message: e.to_string() })?;
            println!("Rust: Successfully loaded from keychain");
            Ok(password_str)
        }
        Err(e) => {
            println!("Rust: Failed to load from keychain: {}", e);
            Err(e.into())
        }
    }
}

#[derive(Debug, Serialize)]
struct StoredWallet {
    public_key: String,
    account: String,  // We'll use this to keep track of different wallets
}

#[tauri::command]
async fn list_stored_wallets() -> Result<Vec<StoredWallet>, String> {
    // Try to load a sequence of wallets with predictable account names
    let mut wallets = Vec::new();
    
    // We'll check our standard account first
    match get_generic_password(SERVICE_NAME, "primary") {
        Ok(password) => {
            if let Ok(private_key) = String::from_utf8(password) {
                // Convert private key to public key for display
                if let Ok(secret_key) = bs58::decode(&private_key).into_vec() {
                    if secret_key.len() == 64 {  // Ensure it's a valid Solana keypair length
                        let keypair = Keypair::from_bytes(&secret_key).map_err(|e| e.to_string())?;
                        wallets.push(StoredWallet {
                            public_key: keypair.to_base58_string(),
                            account: "primary".to_string(),
                        });
                    }
                }
            }
        }
        Err(e) => {
            println!("No primary wallet found: {}", e);
            // Not finding a wallet is okay, we just continue
        }
    }

    Ok(wallets)
}


fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            save_to_keyring,
            load_from_keyring
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}