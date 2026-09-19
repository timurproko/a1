#!/usr/bin/env node

// Compatibility: updaters older than 0.1.8-dev.479 run this entry from the tree they just
// installed to point a terminal-package proxy that no longer exists at that tree. Those
// updaters treat a missing file as a failure worth a stack trace on the user's terminal,
// so the entry stays, does nothing, and exits successfully. Newer updaters never run it.
process.exitCode = 0;
