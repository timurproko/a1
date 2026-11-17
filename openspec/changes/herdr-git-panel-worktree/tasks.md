## 1. Publish the active A1 project directory

- [x] 1.1 Extend the existing endpoint-ready native reporter with the active committed backend cwd and preserve identity-only ownership compatibility.
- [x] 1.2 Refresh the directory on successful context replacement and heartbeat, and clear only the exact owned publication.
- [x] 1.3 Add focused reporter/readiness fixtures for worktree transitions, stale callbacks, path handling and foreign ownership; document the native label contract.

## 2. Resolve Herdr Git against the active worktree

- [ ] 2.1 Update the external canonical shared directory resolver and packaging to prefer fresh identity-bound A1 cwd over process and shell launch directories.
- [ ] 2.2 Preserve local/remote routing and ordinary directory fallbacks; add disposable fixtures for stale reports, agent switches and old Git responses.
- [ ] 2.3 Record the external source revision/diff, build/deployment status and any explicit rollout gaps in implementation evidence.
