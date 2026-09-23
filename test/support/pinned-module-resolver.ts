/**
 * Vitest setup: install the pinned pi-tui resolver hook in every worker before any test module
 * loads, exactly as the bin/ entries do at launch, so tests see the one module identity the
 * product ships with (A1's renderer and pinned Pi's extensions sharing pi-tui classes).
 */
import { resolve } from "node:path";
// @ts-expect-error — plain shipped JS module without type declarations.
import { installPinnedPiTuiResolver } from "../../bin/module-resolver.js";

// Invariant: tests use the checkout's pin even when launched by another Pi installation.
delete process.env.PI_PACKAGE_DIR;
installPinnedPiTuiResolver(resolve("."));
