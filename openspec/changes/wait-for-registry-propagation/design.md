# Design

## Why the window was too short

The verification loop was written when a published version appeared in the package metadata within a few seconds of the upload. npm's `--provenance` path now queues the tarball for processing after the upload is accepted, and the `npm publish` output says so explicitly. The observed gap for `0.1.8-dev.467` was 4 minutes 23 seconds with npm's status page reporting all systems operational, so a one-minute budget fails routinely rather than on incident days.

## Chosen bound

Sixty attempts ten seconds apart give a ten-minute window. That comfortably covers the observed delay and npm's own "a few minutes" wording while staying inside the publish job's twenty-minute timeout with room for checkout, artifact download, and the upload itself. The interval is doubled because each request is a full package-metadata fetch and nothing is gained by asking the registry twice in ten seconds.

## What is unchanged

Only the retry bound moves. The integrity, shasum, and `dist-tag` checks still fail the run the moment the registry serves different bytes, so a longer wait cannot admit a wrong package. When the window is exceeded the job still fails, and because "Serialize the final registry check" already skips `npm publish` when the exact bytes exist, rerunning the failed jobs verifies the earlier upload instead of attempting a second one.
