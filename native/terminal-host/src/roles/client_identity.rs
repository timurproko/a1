//! Advisory UI version only; it never selects execution custody or grants controller authority.
use std::io::Read;

const PREFIX: &str = "a1-client/";
pub(super) fn version() -> Option<String> {
    let root = super::release_holds::own_release_root()?;
    let mut bytes = Vec::new();
    std::fs::File::open(std::path::Path::new(&root).join("package.json"))
        .ok()?
        .take(65537)
        .read_to_end(&mut bytes)
        .ok()?;
    if bytes.len() > 65536 {
        return None;
    }
    let value: serde_json::Value = serde_json::from_slice(&bytes).ok()?;
    let version = value.get("version")?.as_str()?;
    parse(&format!("{PREFIX}{version}"))
}
pub(super) fn build() -> String {
    version().map_or_else(
        || "workspace-client".into(),
        |version| format!("{PREFIX}{version}"),
    )
}
pub(super) fn parse(build: &str) -> Option<String> {
    let version = build.strip_prefix(PREFIX)?;
    (version.len() <= 128
        && version.as_bytes().first().is_some_and(u8::is_ascii_digit)
        && version
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'-' | b'+'))
        && version.split('.').count() >= 3)
        .then(|| version.to_owned())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn client_identity_is_optional_bounded_and_not_an_execution_identity() {
        assert_eq!(parse("a1-client/0.2.7-dev.42"), Some("0.2.7-dev.42".into()));
        for invalid in [
            "fixture",
            "a1-client/",
            "a1-client/0.2.7\n",
            "a1-client/../source",
        ] {
            assert!(parse(invalid).is_none());
        }
        assert!(parse(&format!("{PREFIX}0.2.7-{}", "x".repeat(129))).is_none());
    }
}
