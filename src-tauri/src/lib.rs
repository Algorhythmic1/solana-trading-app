// In src-tauri/src/lib.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_balance_fetch() {
        // Your test here
    }
}

// Integration tests in src-tauri/tests/integration_test.rs
#[cfg(test)]
mod integration_tests {
    use tauri::testing::{mock_builder, mock_context};

    #[test]
    fn test_full_flow() {
        // Your integration test here
    }
}