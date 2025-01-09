use keyring::Entry;
use serde::Serialize;

#[derive(Debug, Serialize)]
struct KeyringError {
    message: String,
}

impl From<keyring::Error> for KeyringError {
    fn from(error: keyring::Error) -> Self {
        KeyringError {
            message: error.to_string(),
        }
    }
}

#[tauri::command]
async fn save_to_keyring(key: String) -> Result<(), KeyringError> {
    println!("Starting save_to_keyring...");
    println!("Creating keyring entry...");
    let entry: Entry = Entry::new("solana-wallet", "primary").map_err(|e| {
        println!("Failed to create entry: {}", e);
        e
    })?;
    
    println!("Setting password...");
    entry.set_password(&key).map_err(|e| {
        println!("Failed to set password: {}", e);
        e
    })?;
    
    println!("Successfully saved to keyring");
    Ok(())
}

#[tauri::command]
async fn load_from_keyring() -> Result<String, KeyringError> {
    println!("Attempting to load from keyring...");
    let entry: Entry = Entry::new("solana-wallet", "primary")?;
    let password: String = entry.get_password()?;
    println!("Successfully loaded from keyring");
    Ok(password)
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