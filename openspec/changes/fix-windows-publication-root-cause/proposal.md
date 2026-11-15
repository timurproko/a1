## Why

Development publications repeatedly fail in the Windows predecessor-update smoke after staging immutable npm packages. Timeout increases and diagnostics-only publications have not identified why the detached 0.2.7-dev.1307 recovery worker disappears, and fixes to a candidate cannot alter that already-published predecessor.

## What Changes

- Add an explicitly requested, read-only hosted reproduction of an existing published pair, retaining recovery-worker errors and process exit status without changing installed package bytes or publishing anything.
- Correct the identified failing boundary, preserve predecessor compatibility and promotion safety, and cover the reproduced failure before requesting another publication.
- Report concrete smoke phases and bound a stalled update rather than silently waiting twenty minutes.

## Impact

Release smoke orchestration, targeted diagnostic workflow routing, and the release boundary established by captured native evidence. No publication or integration authority changes; required validation and successful native smoke still gate promotion.
