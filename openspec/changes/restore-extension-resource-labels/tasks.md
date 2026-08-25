## 1. Preserve extension source identity

- [x] 1.1 Add a bounded A1-owned extension source summary to the Pi engine
  adapter and populate it from public loaded-extension metadata
- [x] 1.2 Cover valid and absent source metadata at the adapter boundary

## 2. Restore compact label parity

- [x] 2.1 Port pinned Pi's compact package extension labels into the owned shell,
  including scoped npm packages, root and nested indexes, and entry suffixes
- [x] 2.2 Preserve shortest-unique local extension labels and hidden-extension
  behavior
- [x] 2.3 Cover the reported `@narumitw/pi-statusline:dist` rendering and the
  package/local fallback cases in focused shell tests

## 3. Validate and integrate

- [x] 3.1 Run optional typecheck and strict OpenSpec validation
- [x] 3.2 Open the pull request and let CI validate (PR #105)
- [ ] 3.3 Record manual acceptance by comparing bare `a1` with vanilla `pi`, then
  archive the change
