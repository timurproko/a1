//! Kind-neutral tab-bar provider declarations shared by the attach client and resident server.
//! Recipients ask these declarations how a tab activates and what capabilities it owns instead
//! of rebuilding Agent, Settings, Changelog, or utility-specific rules.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TabMultiplicity {
    Multiple,
    Singleton,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TabActivation {
    Create,
    Toggle,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TabLauncherMarker {
    Add,
    Toggle,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TabKindProvider {
    pub name: &'static str,
    pub label: &'static str,
    pub action: &'static str,
    pub multiplicity: TabMultiplicity,
    pub activation: TabActivation,
    pub prewarm: bool,
    pub renameable: bool,
    pub owns_session: bool,
    pub route: Option<&'static str>,
    pub marker: TabLauncherMarker,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum TabKind {
    Agent,
    Settings,
    Changelog,
}

/// Places a newly added visible tab after the complete current tab-bar order. Lifecycle and
/// presentation state never choose a temporary insertion slot.
pub fn append_visible_tab<T>(tabs: &mut Vec<T>, tab: T) {
    tabs.push(tab);
}

impl TabKind {
    pub const ALL: [Self; 3] = [Self::Agent, Self::Settings, Self::Changelog];
    pub const SINGLETONS: [Self; 2] = [Self::Settings, Self::Changelog];
    pub const SINGLETON_COUNT: usize = Self::SINGLETONS.len();

    pub const fn provider(self) -> &'static TabKindProvider {
        match self {
            Self::Agent => &TabKindProvider {
                name: "agent",
                label: "Agent",
                action: "tabs.new",
                multiplicity: TabMultiplicity::Multiple,
                activation: TabActivation::Create,
                prewarm: false,
                renameable: true,
                owns_session: true,
                route: None,
                marker: TabLauncherMarker::Add,
            },
            Self::Settings => &TabKindProvider {
                name: "settings",
                label: "Settings",
                action: "tabs.settings",
                multiplicity: TabMultiplicity::Singleton,
                activation: TabActivation::Toggle,
                prewarm: true,
                renameable: false,
                owns_session: false,
                route: Some("settings"),
                marker: TabLauncherMarker::Toggle,
            },
            Self::Changelog => &TabKindProvider {
                name: "changelog",
                label: "Changelog",
                action: "tabs.changelog",
                multiplicity: TabMultiplicity::Singleton,
                activation: TabActivation::Toggle,
                prewarm: true,
                renameable: false,
                owns_session: false,
                route: Some("changelog"),
                marker: TabLauncherMarker::Toggle,
            },
        }
    }

    pub const fn name(self) -> &'static str {
        self.provider().name
    }

    pub const fn label(self) -> &'static str {
        self.provider().label
    }

    pub const fn action(self) -> &'static str {
        self.provider().action
    }

    pub const fn id_prefix(self) -> &'static str {
        match self {
            Self::Agent => "tab-",
            Self::Settings => "settings-",
            Self::Changelog => "changelog-",
        }
    }

    pub fn from_name(name: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|kind| kind.name() == name)
    }

    pub fn from_action(action: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|kind| kind.action() == action)
    }

    /// Resolves a persisted/live tab id. Every non-singleton id is an Agent identity, including
    /// the reserved first id and prewarmed standby ids.
    pub fn of_id(id: &str) -> Self {
        Self::SINGLETONS
            .into_iter()
            .find(|kind| id.starts_with(kind.id_prefix()))
            .unwrap_or(Self::Agent)
    }

    pub const fn provider_index(self) -> usize {
        self as usize
    }

    pub const fn singleton_index(self) -> Option<usize> {
        match self {
            Self::Agent => None,
            Self::Settings => Some(0),
            Self::Changelog => Some(1),
        }
    }

    /// The singleton kind of a tab id, or `None` for a multi-instance Agent identity.
    pub fn of(id: &str) -> Option<Self> {
        let kind = Self::of_id(id);
        kind.is_singleton().then_some(kind)
    }

    pub const fn is_singleton(self) -> bool {
        matches!(self.provider().multiplicity, TabMultiplicity::Singleton)
    }

    pub fn open_message(self) -> String {
        format!("tab.open-{}", self.name())
    }

    pub fn prewarm_message(self) -> String {
        format!("tab.prewarm-{}", self.name())
    }

    pub fn from_singleton_message(message: &str) -> Option<(Self, bool)> {
        let (opening, name) = message
            .strip_prefix("tab.open-")
            .map(|name| (true, name))
            .or_else(|| {
                message
                    .strip_prefix("tab.prewarm-")
                    .map(|name| (false, name))
            })?;
        Self::from_name(name)
            .filter(|kind| kind.is_singleton())
            .map(|kind| (kind, opening))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_kind_exposes_one_complete_provider_contract() {
        assert_eq!(
            TabKind::ALL.map(TabKind::name),
            ["agent", "settings", "changelog"]
        );
        assert_eq!(
            TabKind::ALL.map(TabKind::label),
            ["Agent", "Settings", "Changelog"]
        );
        assert_eq!(TabKind::from_action("tabs.new"), Some(TabKind::Agent));
        assert_eq!(
            TabKind::from_action("tabs.settings"),
            Some(TabKind::Settings)
        );
        assert_eq!(TabKind::of_id("tab-1"), TabKind::Agent);
        assert_eq!(TabKind::of_id("standby-1"), TabKind::Agent);
        assert_eq!(TabKind::of_id("settings-1"), TabKind::Settings);
        assert_eq!(TabKind::of_id("changelog-1"), TabKind::Changelog);
        assert!(TabKind::Agent.provider().renameable && TabKind::Agent.provider().owns_session);
        for kind in TabKind::SINGLETONS {
            let provider = kind.provider();
            assert_eq!(provider.activation, TabActivation::Toggle);
            assert!(provider.prewarm && !provider.renameable && !provider.owns_session);
            assert_eq!(provider.route, Some(kind.name()));
        }
    }

    #[test]
    fn newly_added_tabs_append_without_kind_or_presentation_rules() {
        let mut tabs = vec!["agent", "settings", "changelog"];
        append_visible_tab(&mut tabs, "pending");
        assert_eq!(tabs, ["agent", "settings", "changelog", "pending"]);
    }

    #[test]
    fn singleton_wire_messages_derive_from_the_provider() {
        for kind in TabKind::SINGLETONS {
            assert_eq!(
                TabKind::from_singleton_message(&kind.open_message()),
                Some((kind, true))
            );
            assert_eq!(
                TabKind::from_singleton_message(&kind.prewarm_message()),
                Some((kind, false))
            );
        }
        assert_eq!(TabKind::from_singleton_message("tab.create"), None);
    }
}
