## 1. Keep authoritative worktree identity independent of inherited Git redirection

- [ ] 1.1 Add a narrowly scoped Git environment policy for explicitly rooted lifecycle worktree operations without mutating unrelated environment.
- [ ] 1.2 Reject non-repository startup attachment with an actionable diagnostic while preserving prior context and claims.
- [ ] 1.3 Add isolated Git regressions for temporary overrides, foreign identities, valid attachments, entry behavior and atomic rejection.
- [ ] 1.4 Document startup repository requirements and environment-independent validation.

## 2. Provide explicit session-bound detach when ordinary tools cannot resolve their cwd

- [ ] 2.1 Add serialized runtime detach that verifies the exact current session/runtime, clears only its association and claims, and does not validate Git cwd.
- [ ] 2.2 Expose the argument-free sequential worktree_detach recovery tool in claim-owning bare sessions and preserve comparison/override/tool-selection behavior.
- [ ] 2.3 Add registry, tool and runtime integration regressions for blocked cwd, pre-activation recovery, cancellation, identity boundaries and preserved files/foreign claims.
- [ ] 2.4 Document the supported recovery tool and its authority boundaries in feature/recovery guidance.
