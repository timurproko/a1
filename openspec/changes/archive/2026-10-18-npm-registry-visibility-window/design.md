# Design

## Context

See `proposal.md` for the failure. Post-upload verification reads each package's exact-version resource and dist-tag resource until both match the validated bytes. npm's ingestion delay is outside our control; the 10-minute bound was shorter than one observed delay.

## Goals / Non-Goals

**Goals:**

- An upload npm serves within thirty minutes passes verification in the same run, so the published-pair smoke and completion run without a manual rerun.

**Non-Goals:**

- Changing what verification compares, how uploads run, or how a failed run is recovered.

## Decisions

### 1. Keep the interval, raise the attempts to 180

Ten-second polls still finish promptly once npm serves the version; only the failure bound grows, from about 10 to about 30 minutes, which is nearly twice the observed delay.

### 2. Raise the publish job timeout from 30 to 45 minutes

The job spends about a minute before verification. A 30-minute job timeout would cancel a full verification window, turning a clear verification failure into a cancellation.

## Risks / Trade-offs

- **[A genuinely failed upload holds the runner longer]** → It costs about twenty more runner minutes only on failure; recovery stays a rerun of the failed jobs.

## Migration Plan

None. Publication uses the new bound once merged.
