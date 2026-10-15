## 1. Keep hidden resident renderers advancing

- [ ] 1.1 Remove resident visibility as an owned terminal-host presentation hold so active session presenters continue their normal render scheduling and PTY writes while their tab is hidden.
- [ ] 1.2 Stop resident composition from applying bridge visibility as a rendering gate while preserving generation-1 visibility decoding, structured status reporting, rename/stop commands, controller attribution, and direct-mode behavior.
- [ ] 1.3 Confirm the native holder continues to consume hidden-tab PTY output while `surface.subscription` alone suppresses inactive client delivery and forces a complete current surface on selection; change native code only if focused evidence disproves that invariant.

## 2. Prove concurrent background presentation

- [ ] 2.1 Replace the hidden-presentation hold regression with focused evidence that streaming/render-triggering updates write to the resident terminal before visibility returns and do not flush as a delayed reactivation burst.
- [ ] 2.2 Cover visibility-command compatibility, ongoing status reporting, inactive client-surface suppression, current full-surface selection, and unchanged detached-presenter/input isolation behavior in the narrowest applicable TypeScript and native tests.

## 3. Complete pre-ready evidence

- [ ] 3.1 Run focused resident composition, shell-host, bridge, and native terminal-host tests as applicable, plus type checking and strict OpenSpec validation; record commands, results, and explicit known-gap disposition in implementation evidence.
- [ ] 3.2 Review the final diff for accidental protocol, direct-mode, tab-status, input-routing, or surface-delivery changes and document a two-working-tab manual check that confirms background content is current immediately on selection.
