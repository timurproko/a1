## ADDED Requirements

### Requirement: A1 runs one agent per launch without resident tabs
Bare `a1` SHALL run one owned single-agent UI per launch and SHALL NOT offer resident tabs, a tab strip, utility tabs, or tab maintenance commands.

#### Scenario: Tab commands are not offered
- **WHEN** the user runs `a1 tabs` or `a1 solo`
- **THEN** A1 SHALL exit without starting a UI or contacting any host
- **AND** help and usage SHALL list neither word

## REMOVED Requirements

### Requirement: Bare A1 runs one resident tab when opted in
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Quitting bare A1 detaches from resident tabs
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Relaunching bare A1 reattaches every tab
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Tab failure is presented and recoverable per tab
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Bare A1 presents resident A1 sessions as tabs
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Tab chips reproduce the approved v2 strip
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Tab status comes from the tab bridge, not the screen
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Tab status icons are the only attention signal
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Tabs are managed from the strip, mouse, and assignable actions
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Tabs are renamed inline and names are Pi session names
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Closing a tab stops only that session after confirmation when busy
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: The active terminal automatically controls its viewed tab
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Tab shortcuts are declared, configurable, and conflict-checked
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Resident routing requires an interactive terminal
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Tab input rules and prompts follow the viewed tab
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Resident tabs preserve prompt keyboard modifiers
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Resident strip transitions present one stable current frame
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Inline tab rename matches v2
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Automatic tab names use the v2 transition
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Viewed resident A1 matches direct A1 interaction semantics
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Resident selection and clipboard behavior matches direct A1
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Resident shortcuts use the effective A1 shortcut contract
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Resident tabs make independent concurrent progress
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Double Ctrl+C reliably detaches the resident interface
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Resident Settings is one global utility tab
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Resident lifecycle mechanics remain invisible
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Popup gestures preserve a usable v2 menu
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Inline rename supports word motion
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: The normal repository build produces a resident-ready local application
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Open strip popups stay stable while tabs stream
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: The strip row has a solid dark background
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Resident tabs keep the outer terminal theme for unset colors
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Resident dialogs receive keys like solo
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Resident presentation preserves footer hyperlinks
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: First-run project-trust handoff stays visually quiet
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Tab chips pad before the icon and separate it from the name
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Resident structured replay converges to the newest child frame
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Resident attach starts without cursor or selection artifacts
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: The resident tab bar follows the configured edge
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Resident tabs reorder through stable drag-and-drop
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Resident scrollbar rail keeps its gutter column
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: The empty resident shell presents the a1 landing
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: The plus menu is configurable
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: The command palette opens every tab kind
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Changelog is a singleton utility tab
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Tab rename selection uses the owned selection style
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Tab names and session names stay in sync
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Utility tabs run without an Agent engine
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Tabs open at once and resizes repaint without an overlay
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Active tab chips share one resolved color
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Newly added tabs append without initialization reordering
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Agent prompt chrome uses its destination color immediately
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: macOS Option characters trigger bound tab shortcuts
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: macOS shortcut labels name Alt Option everywhere
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: The tab strip has configurable right-side Version and Time items
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.

### Requirement: Resident right-side items expose configuration controls
**Reason**: Resident multi-agent tabs are removed. Bare `a1` is the direct single-agent owned UI; there is no tab strip, resident host, tab bridge, prompt journal, or per-tab process.

**Migration**: Existing resident tabs are not restored. Their Pi session files remain under the profile's `sessions/` directory and resume with `a1 --session <id>`.
