#!/usr/bin/env node

process.stderr.write(
  "AddOne terminal capability is unavailable during redesign. "
    + "This retained release entry point will be replaced by the transparent foreground broker.\n",
);
process.exitCode = 1;
