use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::{ SystemTime, UNIX_EPOCH};
use lazy_static::lazy_static;
use reqwest;
use std::time::Duration;
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

lazy_static!{
  static ref CACHE_LAST_UPDATED: Mutex<Option<u64>> = Mutex::new(None);
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


  //Fetches the token list from Jupiter
  async fn fetch_token_list_from_jupiter() -> Result<Vec<JupiterToken>, String> {
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


  //Checks if the cache is stale or empty, if so, fetches the token list from Jupiter and updates the cache
  async fn update_token_cache(&mut self) -> Result<(), String> {
    println!("Rust: First, checking the cache duration to see if we need to fetch the token list");
    let current_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let should_update = {
        let cache = CACHE_LAST_UPDATED.lock().unwrap();
        match *cache {
            None => true,
            Some(last_updated) => current_time - last_updated >= CACHE_DURATION.as_secs()
        }
    };

    if !should_update {
        println!("Rust: Cache is up to date, no update needed");
        return Ok(());
    }

    println!("Rust:Cache is stale or empty, fetching new token list");
    let tokens = Self::fetch_token_list_from_jupiter().await?;
    self.update_tokens(&tokens)?;
    
    *CACHE_LAST_UPDATED.lock().unwrap() = Some(current_time);
    println!("Rust:Cache updated successfully. Token DB contains {} tokens", tokens.len());

    Ok(())
  }


  //Updates the token database with the new token list
  fn update_tokens(&mut self, tokens: &[JupiterToken]) -> Result<(), String> {
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


  //Searches the token database by address
  pub fn search_by_address(&self, query: String) -> Result<Vec<JupiterToken>, String> {
    let mut stmt = self.conn.prepare(
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


  //Searches the token database by name
  pub fn search_by_name(&self, query: String) -> Result<Vec<JupiterToken>, String> {
    let mut stmt = self.conn.prepare(
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

  //Searches the token database by name or address
  pub fn search_by_any(&self, query: String) -> Result<Vec<JupiterToken>, String> {
    let mut stmt = self.conn.prepare(
        "SELECT * FROM tokens WHERE LOWER(name) LIKE LOWER(?1) OR address LIKE ?1 LIMIT 10"
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


  //Returns all tokens in the database
  pub fn get_all_tokens(&self) -> Result<Vec<JupiterToken>, String> {
    let mut stmt = self.conn.prepare("SELECT * FROM tokens").map_err(|e| e.to_string())?;
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
pub async fn update_token_db() -> Result<(), String> {
  let mut db = TokenDatabase::new()?;
  db.update_token_cache().await
}

#[tauri::command]
pub async fn get_all_tokens() -> Result<Vec<JupiterToken>, String> {
  let db = TokenDatabase::new()?;
  db.get_all_tokens()
}

#[tauri::command]
pub async fn search_tokens_with_address(query: String) -> Result<Vec<JupiterToken>, String> {
  let db = TokenDatabase::new()?;
  db.search_by_address(query)
}

#[tauri::command]
pub async fn search_tokens_with_name(query: String) -> Result<Vec<JupiterToken>, String> {
  let db = TokenDatabase::new()?;
  db.search_by_name(query)
}

#[tauri::command]
pub async fn search_tokens_with_any(query: String) -> Result<Vec<JupiterToken>, String> {
  let db = TokenDatabase::new()?;
  db.search_by_any(query)
}

