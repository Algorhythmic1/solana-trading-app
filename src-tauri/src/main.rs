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
    let entry = Entry::new("solana-wallet", "primary")?;
    entry.set_password(&key)?;
    Ok(())
}

#[tauri::command]
async fn load_from_keyring() -> Result<String, KeyringError> {
    let entry = Entry::new("solana-wallet", "primary")?;
    let password = entry.get_password()?;
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