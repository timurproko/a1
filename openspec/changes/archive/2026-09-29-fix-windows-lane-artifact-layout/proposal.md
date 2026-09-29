## Why

The first hosted Full regression of the sharded Windows workflow (run `36592928866`) passed every Windows shard, the Linux and macOS lanes, and both Windows lane reconstructions, yet `Complete regression required` failed with `complete-regression jobs or evidence are incomplete`. The Windows lane collector uploaded its envelope with a single `full-lanes/*.json` glob; `upload-artifact` roots such an archive at the file's own directory, so the envelope was stored without the `full-lanes/` directory that the required job collects from, and only two of four lanes were found. Every Full regression on `develop` fails the same way until this is fixed.

## What Changes

- Upload each Windows lane envelope together with its shard records so the archive keeps the `.artifacts/validation/full-lanes/` layout the required job collects.
- Add a workflow policy regression asserting that every lane-bearing upload keeps the `full-lanes/` directory in its archive root.
- Leave shard execution, lane reconstruction, the four-lane aggregate, and its fail-closed checks unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The `continuous-integration` requirement already demands four reconstructed lanes; this corrects the implementation that failed to deliver the Windows envelopes to the aggregate.

## Impact

- Changes one upload step in `.github/workflows/full-regression-shared.yml` and its policy test.
- No change to validation scope, timeouts, retries, publication, or branch protection.
