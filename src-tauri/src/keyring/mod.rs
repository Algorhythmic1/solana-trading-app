// TODO: Current implementation uses macOS-specific security-framework
// This is a temporary solution that works reliably on macOS but needs to be
// replaced with a cross-platform solution. Original attempt with the `keyring`
// crate failed to persist keys (possibly due to permissions/implementation issues).
// Future work needed:
// 1. Investigate why `keyring` crate isn't working
// 2. Implement proper cross-platform support using conditional compilation
// 3. Test on Windows and Linux

use serde::Serialize;
use security_framework::passwords::{set_generic_password, get_generic_password};
use solana_sdk::signer::{keypair::Keypair, Signer};
use bs58;

#[derive(Debug, Serialize)]
pub struct KeyringError {
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
pub async fn save_to_keyring(key: String) -> Result<(), KeyringError> {
    println!("Rust: Attempting to save to keyring with service: {}", SERVICE_NAME);
    
    let mut index = 1;
    loop {
        let account = format!("{}{}", ACCOUNT_NAME, index);
        if get_generic_password(SERVICE_NAME, &account).is_err() {
            set_generic_password(SERVICE_NAME, &account, key.as_bytes())?;
            println!("Rust: Successfully saved to keychain with account: {}", account);
            break;
        }
        index += 1;
    }

    Ok(())
}

#[tauri::command]
pub async fn load_from_keyring(index: i32) -> Result<String, KeyringError> {
    println!("Rust: Attempting to load from keyring with service: {}", SERVICE_NAME);
    
    match get_generic_password(SERVICE_NAME, &format!("{}{}", ACCOUNT_NAME, index)) {
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
pub struct StoredWallet {
    pub public_key: String,
    pub account: String,
}

#[tauri::command]
pub async fn list_stored_wallets() -> Result<Vec<StoredWallet>, String> {
    println!("Rust: Attempting to list stored wallets");
    let mut wallets = Vec::new();
    
    let mut index = 1;
    loop {
        let account = format!("{}{}", ACCOUNT_NAME, index);
        
        match get_generic_password(SERVICE_NAME, &account) {
            Ok(password) => {
                if let Ok(private_key) = String::from_utf8(password) {
                    if let Ok(secret_key) = bs58::decode(&private_key).into_vec() {
                        if secret_key.len() == 64 {
                            let keypair = Keypair::from_bytes(&secret_key)
                                .map_err(|e| e.to_string())?;
                            wallets.push(StoredWallet {
                                public_key: bs58::encode(keypair.pubkey().to_bytes()).into_string(),
                                account: account.to_string(),
                            });
                            println!("Rust: Found wallet for account: {}", account);
                        }
                    }
                }
                index += 1;
            },
            Err(_) => break
        }
    }

    println!("Rust: Found {} wallets", wallets.len());
    Ok(wallets)
}