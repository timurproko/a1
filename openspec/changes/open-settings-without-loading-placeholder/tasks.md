## 1. Settings route

- [ ] 1.1 Render the deferred settings surface as blank rows while its module loads, keeping the failure message and the input deferral; verify a route-host test sees only empty rows before the import settles and the settings rows afterwards.
- [ ] 1.2 Remove the settings application's `#loading` flag and `Loading settings…` branch so an empty row set always renders `No settings found.`; verify the search-matches-nothing test pins that notice and the absence of loading text.

## 2. Validation

- [ ] 2.1 Run the focused composition and settings-screen scopes plus typechecking; record passing evidence or explicitly disposition every observed gap before finalization.
- [ ] 2.2 Hand off the built candidate for a physical check that `/settings` opens straight into its rows with no `Loading settings…` flash; record the outcome.
