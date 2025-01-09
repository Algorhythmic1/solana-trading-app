// src-tauri/src/main.rs
// wallet.rs - module containing all wallet-related functions
use keyring::Entry;
use tauri::AppHandle;
use serde::{Serialize, Deserialize};
use keyring::Entry;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

const SERVICE_NAME: &str = "solana-wallet-app";
const ACCOUNT_NAME: &str = "default-wallet"; // We can modify this for multiple wallet support

#[derive(Debug, Serialize, Deserialize)]
struct WalletData {
    keypair: String, // base64 encoded keypair
}

#[tauri::command]
async fn save_keypair(keypair_bytes: Vec<u8>) -> Result<(), String> {
    let keyring = Entry::new(SERVICE_NAME, ACCOUNT_NAME)
        .map_err(|e| e.to_string())?;
    
    let wallet_data = WalletData {
        keypair: BASE64.encode(keypair_bytes),
    };
    
    let json = serde_json::to_string(&wallet_data)
        .map_err(|e| e.to_string())?;
    
    keyring.set_password(&json)
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn load_keypair() -> Result<Vec<u8>, String> {
    let keyring = Entry::new(SERVICE_NAME, ACCOUNT_NAME)
        .map_err(|e| e.to_string())?;
    
    let json = keyring.get_password()
        .map_err(|e| e.to_string())?;
    
    let wallet_data: WalletData = serde_json::from_str(&json)
        .map_err(|e| e.to_string())?;
    
    BASE64.decode(wallet_data.keypair)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn wallet_exists() -> Result<bool, String> {
    let keyring = Entry::new(SERVICE_NAME, ACCOUNT_NAME)
        .map_err(|e| e.to_string())?;
    
    Ok(keyring.get_password().is_ok())
}

#[tauri::command]
async fn delete_wallet() -> Result<(), String> {
    let keyring = Entry::new(SERVICE_NAME, ACCOUNT_NAME)
        .map_err(|e| e.to_string())?;
    
    keyring.delete_password()
        .map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            save_keypair,
            load_keypair,
            wallet_exists,
            delete_wallet,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}