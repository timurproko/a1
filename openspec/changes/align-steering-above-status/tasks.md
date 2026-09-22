## 1. Align fitting transient presentation

- [x] 1.1 Bottom-align pending steering and live status as one fitting transient viewport group.
- [x] 1.2 Preserve semantic transcript selection boundaries, queue/status ownership, and pinned-dock geometry.
- [x] 1.3 Preserve zero-gap overflow scrolling, ordering, end following, and pointer behavior.

## 2. Regression coverage

- [x] 2.1 Cover steering, edit-hint, status, and status-owned spacing adjacency while content fits.
- [x] 2.2 Cover stable steering/status coordinates while fitting transcript content grows.
- [x] 2.3 Cover unchanged ordering, uniqueness, and scrolling after overflow.

## 3. Validation and acceptance

- [x] 3.1 Run focused tests, typecheck, build, architecture governance, strict OpenSpec validation, and diff hygiene.
- [ ] 3.2 Physically verify through `./scripts/dev` that queued steering appears directly above live status and both remain correctly ordered when the viewport overflows.
