use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use lazy_static::lazy_static;
use reqwest;
use rusqlite::{Connection, params};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JupiterToken {
    pub address: String,
    #[serde(rename = "chainId")]
    pub chain_id: i32,
    pub decimals: i32,
    pub name: String,
    pub symbol: String,
    #[serde(rename = "logoURI")]
    pub logo_uri: Option<String>,
    pub tags: Option<Vec<String>>,
}

struct CachedTokenList {
    tokens: Vec<JupiterToken>,
    last_updated: SystemTime,
}

lazy_static! {
    static ref TOKEN_CACHE: Mutex<Option<CachedTokenList>> = Mutex::new(None);
}

const CACHE_DURATION: Duration = Duration::from_secs(1800); // 30 minutes
const JUPITER_TOKEN_LIST_URL: &str = "https://token.jup.ag/all";

pub struct TokenDatabase {
    conn: Connection,
}

impl TokenDatabase {
    pub fn new() -> Result<Self, String> {
        let conn = Connection::open("tokens.db").map_err(|e| e.to_string())?;
        
        conn.execute(
            "CREATE TABLE IF NOT EXISTS tokens (
                address TEXT PRIMARY KEY,
                chain_id INTEGER,
                decimals INTEGER,
                name TEXT,
                symbol TEXT,
                logo_uri TEXT,
                last_updated INTEGER
            )",
            [],
        ).map_err(|e| e.to_string())?;
        
        Ok(Self { conn })
    }

    pub fn update_tokens(&mut self, tokens: &[JupiterToken]) -> Result<(), String> {
        let tx = self.conn.transaction().map_err(|e| e.to_string())?;
        
        for token in tokens {
            tx.execute(
                "INSERT OR REPLACE INTO tokens 
                (address, chain_id, decimals, name, symbol, logo_uri, last_updated)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    token.address,
                    token.chain_id,
                    token.decimals,
                    token.name,
                    token.symbol,
                    token.logo_uri,
                    SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_secs()
                ],
            ).map_err(|e| e.to_string())?;
        }
        
        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_tokens(self) -> Result<Vec<JupiterToken>, String> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM tokens"
        ).map_err(|e| e.to_string())?;
        
        let tokens = stmt.query_map([], |row| {
            Ok(JupiterToken {
                address: row.get(0)?,
                chain_id: row.get(1)?,
                decimals: row.get(2)?,
                name: row.get(3)?,
                symbol: row.get(4)?,
                logo_uri: row.get(5)?,
                tags: None,
            })
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        
        Ok(tokens)
    }
}

#[tauri::command]
pub async fn get_token_list() -> Result<Vec<JupiterToken>, String> {
    println!("Checking token cache status");
    let mut cache = TOKEN_CACHE.lock().map_err(|e| e.to_string())?;
    
    // Check if we need to refresh the cache
    let should_refresh = match &*cache {
        None => {
            println!("No cache found, will fetch tokens");
            true
        },
        Some(cached) => {
            let is_stale = cached.last_updated.elapsed().map_err(|e| e.to_string())? > CACHE_DURATION;
            println!("Cache found. Is stale: {}", is_stale);
            is_stale
        }
    };

    if should_refresh {
        println!("Fetching fresh token list");
        let tokens = fetch_token_list().await?;
        println!("Fetched {} tokens", tokens.len());
        
        // Update database
        let mut db = TokenDatabase::new()?;
        db.update_tokens(&tokens)?;
        println!("Updated database with new tokens");
        
        // Update cache
        *cache = Some(CachedTokenList {
            tokens: tokens.clone(),
            last_updated: SystemTime::now(),
        });
        
        Ok(tokens)
    } else {
        println!("Using cached token list");
        Ok(cache.as_ref().unwrap().tokens.clone())
    }
}

async fn fetch_token_list() -> Result<Vec<JupiterToken>, String> {
    let client = reqwest::Client::new();
    let response = client
        .get(JUPITER_TOKEN_LIST_URL)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let tokens: Vec<JupiterToken> = response
        .json()
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(tokens)
}

#[tauri::command]
pub async fn get_all_tokens() -> Result<Vec<JupiterToken>, String> {
    println!("Attempting to get all tokens from database");
    let mut db = TokenDatabase::new()?;
    
    // Add count check
    let count: i64 = db.conn.query_row(
        "SELECT COUNT(*) FROM tokens",
        [],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;
    
    println!("Found {} tokens in database", count);

    if count == 0 {
        println!("No tokens found in database, fetching from Jupiter");
        let tokens = fetch_token_list().await?;
        println!("Fetched {} tokens from Jupiter", tokens.len());
        db.update_tokens(&tokens)?;
        println!("Updated database with new tokens");
    }
    
    let tokens = db.get_tokens()?;
    println!("Successfully retrieved {} tokens", tokens.len());
    
    Ok(tokens)
}

#[tauri::command]
pub async fn search_tokens_with_address(query: String) -> Result<Vec<JupiterToken>, String> {
    let db = TokenDatabase::new()?;
    let mut stmt = db.conn.prepare(
        "SELECT * FROM tokens WHERE address LIKE ?1 LIMIT 10"
    ).map_err(|e| e.to_string())?;
    
    let search = format!("%{}%", query);
    let tokens = stmt.query_map([search], |row| {
        Ok(JupiterToken {
            address: row.get(0)?,
            chain_id: row.get(1)?,
            decimals: row.get(2)?,
            name: row.get(3)?,
            symbol: row.get(4)?,
            logo_uri: row.get(5)?,
            tags: None,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    
    Ok(tokens)
}

#[tauri::command]
pub async fn search_tokens_with_name(query: String) -> Result<Vec<JupiterToken>, String> {
    let db = TokenDatabase::new()?;
    let mut stmt = db.conn.prepare(
        "SELECT * FROM tokens WHERE LOWER(name) LIKE LOWER(?1) LIMIT 10"
    ).map_err(|e| e.to_string())?;
    let search = format!("%{}%", query);
    let tokens = stmt.query_map([search], |row| {
        Ok(JupiterToken {
            address: row.get(0)?,
            chain_id: row.get(1)?,
            decimals: row.get(2)?,
            name: row.get(3)?,
            symbol: row.get(4)?,
            logo_uri: row.get(5)?,
            tags: None,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(tokens)
}

#[tauri::command]
pub async fn search_tokens_with_any(query: String) -> Result<Vec<JupiterToken>, String> {
    let db = TokenDatabase::new()?;
    let mut stmt = db.conn.prepare(
        "SELECT * FROM tokens WHERE LOWER(name) LIKE LOWER(?1) OR address LIKE ?1LIMIT 10"
    ).map_err(|e| e.to_string())?;
    let search = format!("%{}%", query);
    let tokens = stmt.query_map([search], |row| {
        Ok(JupiterToken {
            address: row.get(0)?,
            chain_id: row.get(1)?,
            decimals: row.get(2)?,
            name: row.get(3)?,
            symbol: row.get(4)?,
            logo_uri: row.get(5)?,
            tags: None,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(tokens)
}