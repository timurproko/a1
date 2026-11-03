//! Plain launch observes authenticated topology; only explicit intent creates execution.
use super::*;

pub(super) fn selection(tabs: &[wire::TabSummary], selected: Option<&str>) -> Option<String> {
    let first_agent = tabs.iter().find(|tab| {
        crate::core::tab_bar::TabKind::of_id(&tab.tab_id)
            .provider()
            .owns_session
    })?;
    selected
        .filter(|id| tabs.iter().any(|tab| tab.tab_id == *id))
        .map(str::to_owned)
        .or_else(|| Some(first_agent.tab_id.clone()))
}

pub(super) fn explicit_session(frame: &Envelope) -> bool {
    frame
        .body
        .get("sessionFile")
        .is_some_and(|value| !matches!(value, Value::Nil))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn tab(scope: &str, id: &str) -> wire::TabSummary {
        wire::TabSummary {
            tab_id: WorkspaceTab::id_for(scope, id),
            name: id.into(),
            name_source: "system".into(),
            lifecycle: "ready".into(),
            cwd: "fixture".into(),
        }
    }
    #[test]
    fn no_agents_means_landing_even_with_a_previously_selected_utility() {
        assert_eq!(selection(&[], None), None);
        let utility = tab("old", "settings-1");
        assert_eq!(
            selection(std::slice::from_ref(&utility), Some(&utility.tab_id)),
            None
        );
        assert_eq!(selection(&[utility, tab("new", "changelog-1")], None), None);
    }
    #[test]
    fn retained_agents_have_a_selected_identity_before_any_first_frame() {
        let old = tab("old", "tab-1");
        let new = tab("new", "tab-1");
        let utility = tab("new", "settings-1");
        let tabs = [utility.clone(), old.clone(), new.clone()];
        assert_eq!(selection(&tabs, None), Some(old.tab_id.clone()));
        assert_eq!(selection(&tabs, Some(&new.tab_id)), Some(new.tab_id));
        assert_eq!(selection(&tabs, Some("closed")), Some(old.tab_id));
        assert_eq!(
            selection(&tabs, Some(&utility.tab_id)),
            Some(utility.tab_id)
        );
    }
    #[test]
    fn attach_without_session_is_observation_only_but_explicit_session_intent_is_preserved() {
        for body in [
            serde_json::json!({}),
            serde_json::json!({"sessionFile":null}),
            serde_json::json!({"sessionFile":"/fixture/session.jsonl"}),
        ] {
            let expected = body
                .get("sessionFile")
                .is_some_and(|value| value.is_string());
            let frame: Envelope =
                protocol::decode_frame(&wire::frame("attach.start", None, body).unwrap()).unwrap();
            assert_eq!(explicit_session(&frame), expected);
        }
    }
}
