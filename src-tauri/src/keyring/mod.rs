// TODO: Current implementation uses macOS-specific security-framework
// This is a temporary solution that works reliably on macOS but needs to be
// replaced with a cross-platform solution. Original attempt with the `keyring`
// crate failed to persist keys (possibly due to permissions/implementation issues).
// Future work needed:
// 1. Investigate why `keyring` crate isn't working
// 2. Implement proper cross-platform support using conditional compilation
// 3. Test on Windows and Linux

use keyring::Entry;
use serde::Serialize;
use solana_sdk::signer::{keypair::Keypair, Signer};
use bs58;

#[derive(Debug, Serialize)]
pub struct KeyringError {
    message: String,
}

impl From<keyring::Error> for KeyringError {
    fn from(error: keyring::Error) -> Self {
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
    let mut account = format!("{}{}", ACCOUNT_NAME, index);

    loop {
        // Create a new entry for the current account
        let entry = match Entry::new(SERVICE_NAME, &account) {
            Ok(entry) => entry,
            Err(e) => {
                println!("Rust: Failed to create entry: {}", e);
                return Err(KeyringError::from(e));
            }
        };

        // Check if a password is already stored
        match entry.get_password() {
            Err(_) => {
                // If no password is found, attempt to set the password
                match entry.set_password(&key) {
                    Ok(_) => {
                        let pw = entry.get_password()?;

                        println!("Rust: Successfully saved to keychain with account: {} and password: {}", account, pw);
                        return Ok(());
                    },
                    Err(e) => {
                        println!("Rust: Failed to set password: {}", e);
                        return Err(KeyringError::from(e));
                    }
                }
            },
            Ok(_) => {
                // If a password is found, increment the index and try the next account
                index += 1;
                account = format!("{}{}", ACCOUNT_NAME, index);
            }
        }
    }
}


#[tauri::command]
pub async fn load_from_keyring(index: i32) -> Result<String, KeyringError> {
    let account = format!("{}{}", ACCOUNT_NAME, index);

    println!("Attempting to load from keyring...");
    let entry = match Entry::new(SERVICE_NAME, &account) {
        Ok(entry) => entry,
        Err(e) => {
            println!("Failed to create entry: {}", e);
            return Err(KeyringError::from(e));
        }
    };
    match entry.get_password() {
        Ok(password) => {
            Ok(password)
        },
        Err(e) => {
            println!("Failed to get password: {}", e);
            Err(KeyringError::from(e))
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
        println!("Rust: scanning stored passwords with account: {} for service: {}", account, SERVICE_NAME);

        let entry: Entry = Entry::new(SERVICE_NAME, &account).map_err(|e| e.to_string())?;

        match entry.get_password() {
            Ok(password) => {
                //println!("Rust: Found password: {} with account: {} for service: {}", password, account, SERVICE_NAME);
                if let Ok(secret_key) = bs58::decode(&password).into_vec() {
                    if secret_key.len() == 64 {
                        
                        let keypair = Keypair::from_bytes(&secret_key)
                            .map_err(|e| e.to_string())?;
                        //println!("Rust: secret_key length is 64, and keypair construction is valid.");
                        //println!("Rust: keypair public key: {} and account: {}", keypair.pubkey().to_string(), account);
                        wallets.push(StoredWallet {
                            public_key: bs58::encode(keypair.pubkey().to_bytes()).into_string(),
                            account: account.to_string(),
                        });
                        //println!("Rust: Found wallet for account: {}", account);  
                    }
                }
                index += 1;
            },
            Err(e) => {
                //println!("Rust: get_password() returned error: {}", e);
                //println!("Rust: No more entries found. Last account searched: {} with error: {}", account, e);
                break; // Stop if no more entries are found
            }
        }
    }

    println!("Rust: Found {} wallets", wallets.len());
    Ok(wallets)
}