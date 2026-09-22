#!/usr/bin/env bash
# Provision and exercise the compiler before npm prepare's bounded diagnostic probes.
# Each hosted runner is independent; a successful guardian/package job cannot warm another job.
set -euo pipefail
rustup toolchain install stable --profile minimal --no-self-update
rustup default stable
cargo --version
rustc --version
