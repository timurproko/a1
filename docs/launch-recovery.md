# Startup recovery after process termination

A1 reconciles recoverable runtime ownership automatically when the user starts it again after a process crash or forced termination. Users should not need to find PIDs, delete session or control databases, restart a supervisor, or reboot to clear a stale record.

## Recovery boundary

Supervisor metadata carries an additive native process-creation token. Endpoint handshakes still use the existing supervisor, boot, release, and opaque start-identity fields for compatibility; new supervisors use their native token in that start field as well. A failed probe is retried; native process inspection distinguishes a terminated process object or reused PID from the recorded owner. Older records remain readable: an absent process is reclaimable, while a live legacy PID is not treated as dead merely because its timestamp format differs. Windows and macOS native creation times strictly later than a legacy publication, with a one-second margin, can disprove that recorded ownership. Tick-only Linux legacy evidence remains conservative until absence or a matching handshake establishes the outcome.

Endpoint retirement requires the same publication and a fresh dead-owner observation under a native file-descriptor gate. The gate is never deleted; the OS releases its lock on exit, including forced exit. Supervisor binding, Unix stale-socket removal, metadata publication, and closure use that gate. Losing startups cannot delete the winner's endpoint. A separate shared-database gate serializes boot reconciliation and publication across cohorts. Only the bound winner reconciles old rows, and recorded surviving cohort boots remain protected.

Successful recovery is silent and continues the original profile, launch mode, and session selection. Saved sessions are not deleted or rewritten by endpoint recovery. Resident holders and their session-writer locks retain their independent ownership; restarting a supervisor is not permission to stop a resident tab or create a second session writer.

## Exceptional failures

An uninspectable or genuinely unresponsive live owner is preserved after bounded retries. Empty saved instance lists are not authority to terminate it. The command returns a short recovery message instead of an uncaught stack or the old internal uncertain-live-ownership paragraph. Missing native recovery support or inaccessible runtime storage remains an installation or permission failure, not proof that an owner is dead.

A recovery attempt may replace one bounded `<endpoint-metadata>.recovery.json` summary containing only a reason, attempt count, and timestamp. It is diagnostic only, contains no session data or credentials, and never grants cleanup authority. The `.authority` gate files are also not user cleanup targets.

This restores launch availability, not killed process memory. Killing every Node process also kills the terminal-restoration watcher; no alternative executable is started to evade that limitation. Real OS permission failures, damaged installations, and persistently live unresponsive services cannot be converted into safe success by ignoring ownership.

## Regression boundaries

The focused fixtures use isolated runtime/data roots and recorded fixture process identities. They cover supervisor, guardian, root-runtime, recovery-gate, PID-reuse, concurrent-startup, and Windows all-recorded-Node loss, plus native resident server/holder/tab loss in the resident lane. They never terminate processes by image name. Another managed runtime, a separate cohort, saved session bytes, and an unrelated sentinel process establish the preservation boundaries.
