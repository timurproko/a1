## Context

`parallelize-windows-full-regression` added a `windows-lane` collector per Windows runtime that merges four shard records and binds the lane envelope to `.artifacts/validation/full-lanes/<lane>.json`. The `required` job downloads every `full-regression-<source>-<run>-<attempt>-*` artifact and copies files matching `*/full-lanes/*.json`. Linux and macOS uploads list several paths, so their archive root is `.artifacts/validation` and `full-lanes/` survives. The collector listed only `full-lanes/*.json`, so its archive root was `full-lanes/` itself and the downloaded file sat directly under the artifact directory.

## Decisions

- Upload `full-lanes/*.json` together with `full-shards/*.json` from the collector. Their common ancestor is `.artifacts/validation`, so the lane envelope keeps `full-lanes/`, and the merged shard records are retained next to it as evidence. The collector's download pattern ends in `-<shard>` and never matches its own lane artifact, and the required job still copies only `full-lanes/` files.
- Loosening the required job's collection glob was rejected: accepting any `*.json` at an artifact root would let unrelated files be read as lane evidence.
- A policy test computes each lane-bearing upload's archive root and rejects one that ends in `full-lanes/`, so the same layout loss cannot return in any job.

## Evidence

- Run `36592928866` (source `9758a850`): all eight Windows shards, Linux Node 24, macOS Node 24, and both `windows-lane` jobs passed; `Complete regression required` failed with `complete-regression jobs or evidence are incomplete`. The downloaded `windows-2025-node24` artifact contained only `windows-2025-node24.json` at its root.
- The same run confirms the sharding works: Windows Node 22 validated in 16.0 minutes across overlapping shards (27.5 summed; package 12.8, core 5.4, rendering 5.3, resource 4.0) and Node 24 in 15.4 minutes (26.3 summed), against 29.4 and 33.2 minutes in run `36400505675`. The package shard, dominated by the unchanged published-predecessor test (about 9 minutes), is the remaining critical path.
