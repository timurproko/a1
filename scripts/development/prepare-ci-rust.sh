#!/usr/bin/env bash
# Provision and exercise the pinned compiler before npm prepare's bounded diagnostic probes.
# Each hosted runner is independent; a successful guardian/package job cannot warm another job.
# The version comes from rust-toolchain.toml so a new upstream stable changes no job until the pin does.
set -euo pipefail
channel="$(sed -nE 's/^channel = "([^"]+)"$/\1/p' rust-toolchain.toml)"
if [ -z "$channel" ]; then
  echo "rust-toolchain.toml does not pin a toolchain channel" >&2
  exit 1
fi
rustup toolchain install "$channel" --profile minimal --no-self-update
rustup default "$channel"
cargo --version
rustc --version
