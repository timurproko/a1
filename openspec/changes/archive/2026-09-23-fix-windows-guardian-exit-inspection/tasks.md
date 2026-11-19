## 1. Establish deterministic Windows evidence

- [x] 1.1 Preserve issue #377's exact run, candidate, failing test, and guardian result as pre-fix evidence; verify the record distinguishes the historical CI failure from the current focused pass and does not claim a recurring failure without evidence.
- [x] 1.2 Add a deterministic native Windows fixture that retains a process object after termination; verify creation-time information remains queryable while the process-object wait is signaled, and verify the current inspector would misclassify that boundary before accepting a production change.

## 2. Correct live process identity inspection

- [x] 2.1 Open one Windows process handle with the minimum query and synchronization rights needed for state and identity; verify state classification and creation-time retrieval cannot silently cross PID generations.
- [x] 2.2 Return an identity only when a zero-duration wait observes that exact process object active; return the existing absent/dead result for signaled or nonexistent objects and preserve explicit errors for denied access, wait failure, creation-time failure, and unexpected outcomes.
- [x] 2.3 Preserve guardian process creation, Job Object assignment, owner/root waiting, status publication, descendant termination, exit-code propagation, and handle closure; verify the inspector repair changes no containment or terminal behavior.

## 3. Cover the public and packaged boundaries

- [x] 3.1 Extend Windows guardian integration coverage for repeated active inspections, stable creation identity, confirmed termination, nonexistent PID, and bounded repeated execution; verify terminated inspection exits 3 with no identity output and errors do not masquerade as death.
- [x] 3.2 Exercise PID reuse and rapid exit/replacement controls where the platform fixture can do so safely; verify reconciliation relies on PID plus creation token and never accepts a token from a different opened process object.
- [x] 3.3 Build the release guardian and run exact packaged/native containment checks; verify the shipped executable has the same inspection result as the native fixture and no test depends on an unshipped helper mode.

## 4. Validate and hand off

- [x] 4.1 Run focused native guardian, Windows process-containment, launch lifecycle, package inventory, typecheck, architecture, documentation, and strict OpenSpec validation; retain bounded evidence without weakening assertions or extending correctness deadlines.
- [x] 4.2 Wire the native regression into the existing selected guardian CI step and preserve the Windows containment scope; verify no lane, selection, trigger, permission, budget, or publishing authority changes, while leaving exact-head CI as a required delivery gate before handoff.
- [x] 4.3 Provide the exact built candidate and a concise inspection smoke procedure, record known gaps and open delivery gates, and preserve maintainer acceptance as a prerequisite for manual merge and archival.
