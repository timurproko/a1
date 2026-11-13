## 1. Route Herdr-hosted clipboard operations through the user terminal instead of the agent host

- [ ] 1.1 Extend the shared clipboard destination policy to recognize nonempty Herdr terminal identity and the Herdr terminal-program marker while preserving existing non-Herdr decisions.
- [ ] 1.2 Add isolated transport regressions for Herdr identity with overridden or absent emulator metadata, terminal-only copy delivery, and refusal to substitute a host-native writer.
- [ ] 1.3 Add shell regressions for selection autocopy, explicit copy, exactly-once terminal-provided paste, and refusal of wrong-host native paste acquisition while preserving explicit clipboard ports.
- [ ] 1.4 Update the clipboard architecture documentation with Herdr destination ownership, acknowledgement limits, and terminal-provided paste behavior.
