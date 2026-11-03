//! Positive closure history reconciles stale UI references without deriving source authority.
use std::collections::VecDeque;

#[derive(Default)]
pub(super) struct ClosedTabs(VecDeque<String>);
impl ClosedTabs {
    pub(super) fn remember(&mut self, id: String) {
        if !self.contains(&id) {
            if self.0.len() == 4096 {
                self.0.pop_front();
            }
            self.0.push_back(id);
        }
    }
    pub(super) fn contains(&self, id: &str) -> bool {
        self.0.iter().any(|closed| closed == id)
    }
}

pub(super) fn response(message: &str, known_closed: bool) -> Option<(&'static str, bool)> {
    match message {
        "tab.close" => Some(("tab.closed", known_closed)),
        "tab.rename" => Some(("tab.renamed", false)),
        "tab.restart" => Some(("tab.restarted", false)),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn only_positive_closure_makes_a_duplicate_close_successful() {
        let mut closed = ClosedTabs::default();
        assert_eq!(
            response("tab.close", closed.contains("old")),
            Some(("tab.closed", false))
        );
        closed.remember("old".into());
        assert_eq!(
            response("tab.close", closed.contains("old")),
            Some(("tab.closed", true))
        );
        assert_eq!(
            response("tab.rename", closed.contains("old")),
            Some(("tab.renamed", false))
        );
        assert_eq!(response("tab.view", true), None);
        assert!(!closed.contains("other"));
    }
    #[test]
    fn closure_history_is_bounded_and_does_not_retain_duplicate_entries() {
        let mut closed = ClosedTabs::default();
        for index in 0..10000 {
            closed.remember(format!("tab-{index}"));
        }
        closed.remember("tab-9999".into());
        assert_eq!(closed.0.len(), 4096);
        assert!(!closed.contains("tab-0"));
        assert!(closed.contains("tab-9999"));
    }
}
