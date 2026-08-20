process.stderr.write(
  "Local npm preview publication is disabled. Use .github/workflows/publish-next.yml with the exact accepted @timurproko/a1 source commit, version, integrity, and shasum.\n",
);
process.exitCode = 1;
