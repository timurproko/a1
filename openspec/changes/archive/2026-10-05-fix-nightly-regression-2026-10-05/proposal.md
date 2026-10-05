## Why

The 2026-10-05 Full regression failed on Windows Node 24 when the published-`0.2.2` bridge fixture spent its recovery guardian's entire unchanged 120-second deadline recursively copying the exact 654-file, 23-MiB candidate after launcher protection had begun. The same candidate passed on Windows Node 22, the preceding Node 24 run passed, and the only suspect commit changed progress colors rather than predecessor recovery, identifying hosted-runner filesystem contention in the fixture's simulated npm work rather than a product regression.

## What Changes

- Stage an exact candidate copy before entering each published predecessor's protected replacement interval.
- Make the fixture's fake npm perform only the final same-volume package swap and launcher writes while the immutable predecessor guardian owns recovery.
- Preserve the real published predecessor code, exact candidate bytes, activation and command assertions, supported runtimes, deadlines, and no-retry behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Existing self-update and isolated-regression requirements already require exact published-predecessor replacement evidence under bounded deadlines; this change removes unrelated payload-copy contention from that protected interval.

## Impact

The implementation is limited to the Windows published-predecessor integration fixture. Product update and recovery code, package contents, validation selection, and timeout policy remain unchanged.
