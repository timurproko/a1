## 1. Command grammar matches the dispatcher

- [x] 1.1 Rewrite the `a1-shell` update, launch, help, and version requirements to the exit codes and prompt handling in `src/cli/dispatch.ts` and `src/cli/version-stats.ts`
- [x] 1.2 Rewrite the `launch-profiles` and `pi-compatible-launch` requirements for reserved words and unimplemented Pi options, without phase labels
- [x] 1.3 Correct `a1 update self` in `cli-self-update` to a status 2 failure

## 2. Private launch context is specified as negotiated

- [x] 2.1 Replace the three cutover requirements in `cli-self-update` with the per-release contract and the context validation in `src/foundation/launch-context/index.ts`
- [x] 2.2 State the superseded launch keys as a declared boundary in `product-identity`

## 3. Session, uninstall, installer, and package requirements match the code

- [x] 3.1 Specify Continue, Fork, and Cancel for a missing stored cwd and the held-session fork offer in `cli-session-resume`
- [x] 3.2 Specify the removal prefix, refusals, and statuses in `cli-uninstall`
- [x] 3.3 Correct the failure vocabulary and statuses in `silent-installer`
- [x] 3.4 Correct update summaries and repair the corrupted requirement and empty scenario in `extension-packages`
- [x] 3.5 Match the README navigator requirement to the README's sections in `readme-section-navigation`

## 4. Delivery, one-time, and out-of-repository requirements are removed

- [x] 4.1 Remove the evidence-only requirements from `cli-session-resume`
- [x] 4.2 Remove the first-publication requirement and the superseded startup budgets from `a1-shell`
- [x] 4.3 Remove consumer rules from `integration-api` and the private plugin requirements from `herdr-a1-integration`
- [x] 4.4 Replace the pull request review requirement in `product-identity` with the policy rules the naming check enforces

## 5. Governance records match the applied specs

- [x] 5.1 Apply the deltas in a scratch copy and confirm strict validation of the change and of the resulting specs
- [x] 5.2 Regenerate `config/product-identity-legacy-inventory.json` and update `config/product-identity-legacy-allowlist.json` for the applied tree
- [x] 5.3 Run the governance checks on the applied tree
