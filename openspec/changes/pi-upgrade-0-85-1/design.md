# Design

## Proposed by the sync, decided by a reviewer

The upgrade script bumps the pins, evaluates the candidate in isolation, three-way merges each vendored copy (old upstream, new upstream, A1 copy), regenerates every derived artifact, and runs the gates. It never resolves a conflict, never drops an orphaned inventory entry, and never merges; each of those is a review item in the pull-request body.
