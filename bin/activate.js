#!/usr/bin/env node

// Protocol: the updater that installed this tree starts this entry with --data-dir and
// --target-version and reads one JSON progress event per line. The tree activates itself
// with its own release code, so the updater needs to know nothing else about its layout.
const { runActivationEntry } = await import("../dist/foundation/release/update-activation.js");

process.exitCode = await runActivationEntry(process.argv.slice(2), import.meta.url);
