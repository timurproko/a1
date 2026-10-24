## 1. Invocation channel context

- [ ] 1.1 Add an optional validated invocation-version field to the neutral private launch context and preserve it across direct, guardian, and resident launch reconstruction.
- [ ] 1.2 Populate the invocation version from the installed package after safe bootstrap discovery without reading the mutable package during the guarded launch-during-update path.
- [ ] 1.3 Cover context validation, stale-value replacement, and bootstrap propagation when a retained release is selected.

## 2. Notify-mode release discovery

- [ ] 2.1 Pass the invocation version into owned UI startup composition as a distinct notification baseline.
- [ ] 2.2 Use the invocation baseline only for `Notify`, retaining executing-version discovery for `Auto` and fallback paths.
- [ ] 2.3 Cover stable-launcher and development-launcher notices when the selected runtime belongs to the other channel, including channel-keyed cache behavior and manual commands.
