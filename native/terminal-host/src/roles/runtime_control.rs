//! Versioned client-facing control contract, independent of the executing release's identity.
//!
//! This describes existing native attach operations; it grants no cross-release registry or
//! holder authority. Consumers must bind the descriptor to an authenticated exact source.

use serde::{Deserialize, Serialize};

pub const API: &str = "resident-control-v1";
pub const CORE: &[&str] = &[
    "attach",
    "tab.list",
    "tab.view",
    "input",
    "resize",
    "detach",
    "controller-boundary",
];

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeControl {
    pub api: String,
    pub generation: u16,
    pub release_id: String,
    pub scope: String,
    pub epoch: u64,
    pub boot_id: String,
    pub os_session_id: String,
    pub core: Vec<String>,
    pub frame_limit: u32,
    pub input_limit: u32,
    /// Disconnect is never permission to repeat input, create, close or tool work.
    pub retry_input: bool,
}

impl RuntimeControl {
    pub fn describe(
        release_id: String,
        scope: String,
        epoch: u64,
        boot_id: String,
        os_session_id: String,
    ) -> Self {
        Self {
            api: API.into(),
            generation: crate::protocol::GENERATION,
            release_id,
            scope,
            epoch,
            boot_id,
            os_session_id,
            core: CORE.iter().map(|method| (*method).into()).collect(),
            frame_limit: crate::protocol::MAX_FRAME_BYTES as u32,
            input_limit: crate::protocol::MAX_INPUT_BYTES as u32,
            retry_input: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn v1_contract_is_frozen_and_does_not_claim_release_equality() {
        let description = RuntimeControl::describe(
            "release-a".into(),
            "scope-a".into(),
            7,
            "boot".into(),
            "login".into(),
        );
        assert_eq!(
            serde_json::to_value(&description).unwrap(),
            serde_json::json!({
                "api": "resident-control-v1", "generation": 1,
                "releaseId": "release-a", "scope": "scope-a", "epoch": 7,
                "bootId": "boot", "osSessionId": "login",
                "core": ["attach", "tab.list", "tab.view", "input", "resize", "detach", "controller-boundary"],
                "frameLimit": 2097152, "inputLimit": 1048576, "retryInput": false,
            })
        );
        let other = RuntimeControl::describe(
            "release-b".into(),
            "scope-b".into(),
            1,
            "boot".into(),
            "login".into(),
        );
        assert_eq!(description.api, other.api);
        assert_ne!(description.release_id, other.release_id);
        assert_ne!(description.scope, other.scope);
    }

    #[test]
    fn additive_optional_fields_do_not_change_the_mandatory_contract() {
        let description =
            RuntimeControl::describe("a".into(), "scope".into(), 1, "boot".into(), "login".into());
        let mut future = serde_json::to_value(&description).unwrap();
        future["optionalCapability"] = true.into();
        assert_eq!(
            serde_json::from_value::<RuntimeControl>(future).unwrap(),
            description
        );
    }
}
