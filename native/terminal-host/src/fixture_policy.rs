//! Accidental-execution interlock, not a replacement for the reviewed runner's OS sandbox.
use std::{env, fs};

pub fn require() -> Result<(), String> {
    // Invariant: fixture children deliberately testing a clean environment retain only the
    // build-bound interlock; the ephemeral receipt must still exist and match the exact run.
    let get = |key: &str| {
        env::var(key)
            .ok()
            .or_else(|| match key {
                "GITHUB_ACTIONS" => {
                    option_env!("NATIVE_FIXTURE_BUILT_HEAD").map(|_| "true".into())
                }
                "GITHUB_SHA" => option_env!("NATIVE_FIXTURE_BUILT_HEAD").map(str::to_owned),
                "GITHUB_RUN_ID" => option_env!("NATIVE_FIXTURE_BUILT_RUN").map(str::to_owned),
                "GITHUB_RUN_ATTEMPT" => {
                    option_env!("NATIVE_FIXTURE_BUILT_ATTEMPT").map(str::to_owned)
                }
                "NATIVE_FIXTURE_ISOLATION_RECEIPT" => {
                    option_env!("NATIVE_FIXTURE_BUILT_RECEIPT").map(str::to_owned)
                }
                _ => None,
            })
            .unwrap_or_default()
    };
    let run = get("GITHUB_RUN_ID");
    let attempt = get("GITHUB_RUN_ATTEMPT");
    let head = env::var("NATIVE_FIXTURE_HEAD").unwrap_or_else(|_| get("GITHUB_SHA"));
    if get("GITHUB_ACTIONS") != "true"
        || run.is_empty()
        || run.starts_with('0')
        || !run.bytes().all(|value| value.is_ascii_digit())
        || attempt.is_empty()
        || attempt.starts_with('0')
        || !attempt.bytes().all(|value| value.is_ascii_digit())
        || head.len() != 40
        || !head.bytes().all(|value| value.is_ascii_hexdigit())
    {
        return Err("Native process fixtures are CI-only; use npm run check:local. Keep quarantined files quarantined.".into());
    }
    let file = get("NATIVE_FIXTURE_ISOLATION_RECEIPT");
    let receipt: serde_json::Value = fs::read(file)
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .ok_or(
            "Native fixture isolation/review is unavailable; required native evidence is blocked",
        )?;
    let text = |key: &str, expected: &str| {
        receipt.get(key).and_then(serde_json::Value::as_str) == Some(expected)
    };
    if !text("schema", "reviewed-isolated-ci-v1")
        || !text("head", &head)
        || !text("runId", &run)
        || !text("runAttempt", &attempt)
        || !text("environment", "native-fixture-security-review")
        || !text("credentials", "none")
        || !text("egress", "loopback-only")
        || !text("securityReview", "approved")
        || receipt
            .get("disposable")
            .and_then(serde_json::Value::as_bool)
            != Some(true)
        || (cfg!(windows)
            && receipt
                .get("defenderRealtime")
                .and_then(serde_json::Value::as_bool)
                != Some(true))
    {
        return Err("Native fixture isolation/review does not match this run; required native evidence is blocked".into());
    }
    Ok(())
}
