# Design

## Context

See `proposal.md` for the failure and its cause.

## Goals / Non-Goals

**Goals:**

- Bare `a1` starts on every profile, whether or not its settings document exists.
- The attach client never creates, replaces, or changes the settings document.

**Non-Goals:**

- Changing how the time format is read, watched, or defaulted.

## Decisions

### 1. Treat `--settings-file` as a file path the role only reads

A dedicated helper returns the path made absolute against the working directory and does nothing else. It does not canonicalize, because canonicalizing requires the file to exist. Directory arguments keep the existing helper, which creates and canonicalizes them.

**Alternative considered:** canonicalize only the parent directory. Rejected because the bootstrap already passes an absolute path and the reader tolerates any path.

### 2. Prove the real case in role fixtures

Every attach fixture writes a settings document before attach starts, and the first lifecycle test asserts it is still a regular file after attach exits. Before the fix every role test fails on Windows; after it they all exercise the user's path.

## Risks / Trade-offs

- **[A path that is not a file]** → The time-format reader already returns its default for a missing, oversized, or unreadable path.

## Migration Plan

No migration. A profile that a development build left with a `settings.json` directory still needs that directory removed by hand; published releases never shipped to a profile without a settings file.
