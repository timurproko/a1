## 1. Generalize prompt-adjacent workflow notices

- [ ] 1.1 Retain the notice's workflow-message kind and route simple bare-A1 status, warning, and error messages through the existing dock notice while preserving the pinned profile's transcript paths.
- [ ] 1.2 Render each notice with its established presenter so informational dim styling and warning/error prefixes, severity colors, padding, leading spacing, and wrapping remain unchanged.
- [ ] 1.3 Preserve one newest-notice replacement rule and the existing submission, structured-presentation, and reset dismissal lifecycle without allowing assistant/tool/work-state updates to clear the notice.

## 2. Protect semantics and route isolation

- [ ] 2.1 Keep every simple dock notice out of document rows, transcript ordering, selection/copy, prompt navigation, persistence, and scrolling while retaining correct dock allocation and editor pointer geometry for wrapped messages.
- [ ] 2.2 Keep structured command components in the transcript and confirm extension info/warning/error notifications use the generalized notice without a parallel placement path.
- [ ] 2.3 Add focused custom-viewport coverage for the reported empty-session `/export` error, warning styling, cross-severity replacement, wrapping, dismissal/reset, extension notifications, and structured-output boundaries; retain unchanged pinned command-message parity evidence.

## 3. Validation and handoff

- [ ] 3.1 Run focused session-shell/component tests, typechecking, architecture checks, and strict OpenSpec validation; record any gap explicitly in `design.md`.
- [ ] 3.2 Build the reconciled candidate and hand off a color-preserving `./scripts/dev` check that compares `/export` in bare A1 with `a1 pi`.
- [ ] 3.3 Obtain maintainer confirmation that bare A1 shows the red export error immediately above the prompt with no top-left transcript message or large gap, while the comparison profile remains unchanged.
