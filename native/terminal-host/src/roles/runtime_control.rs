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
    pub fn validate_binding(
        &self,
        release: &str,
        scope: &str,
        epoch: u64,
        boot: &str,
        login: &str,
    ) -> Result<(), String> {
        let unique = self.core.iter().collect::<std::collections::HashSet<_>>();
        if self.api != API
            || self.generation != crate::protocol::GENERATION
            || self.release_id != release
            || self.scope != scope
            || self.epoch != epoch
            || self.boot_id != boot
            || self.os_session_id != login
            || self.retry_input
            || self.frame_limit != crate::protocol::MAX_FRAME_BYTES as u32
            || self.input_limit != crate::protocol::MAX_INPUT_BYTES as u32
            || self.core.len() > 64
            || unique.len() != self.core.len()
            || self.core.iter().any(|operation| {
                operation.is_empty()
                    || operation.len() > 64
                    || operation.chars().any(char::is_control)
            })
            || CORE
                .iter()
                .any(|operation| !self.core.iter().any(|actual| actual == operation))
        {
            return Err("source runtime control contract is incompatible".into());
        }
        Ok(())
    }

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
    fn native_admission_refuses_changed_identity_core_replay_or_limits() {
        let good = RuntimeControl::describe(
            "release".into(),
            "scope".into(),
            7,
            "boot".into(),
            "login".into(),
        );
        assert!(
            good.validate_binding("release", "scope", 7, "boot", "login")
                .is_ok()
        );
        for change in [
            |value: &mut RuntimeControl| value.api = "resident-control-v2".into(),
            |value: &mut RuntimeControl| value.release_id = "other".into(),
            |value: &mut RuntimeControl| value.scope = "other".into(),
            |value: &mut RuntimeControl| value.epoch = 8,
            |value: &mut RuntimeControl| value.boot_id = "other".into(),
            |value: &mut RuntimeControl| value.os_session_id = "other".into(),
            |value: &mut RuntimeControl| value.retry_input = true,
            |value: &mut RuntimeControl| value.input_limit = 1,
            |value: &mut RuntimeControl| value.frame_limit = 1,
            |value: &mut RuntimeControl| {
                value.core.pop();
            },
            |value: &mut RuntimeControl| value.core.push("attach".into()),
        ] {
            let mut value = good.clone();
            change(&mut value);
            assert!(
                value
                    .validate_binding("release", "scope", 7, "boot", "login")
                    .is_err()
            );
        }
        let mut additive = good.clone();
        additive.core.push("optional.operation".into());
        assert!(
            additive
                .validate_binding("release", "scope", 7, "boot", "login")
                .is_ok()
        );
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
