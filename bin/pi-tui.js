/**
 * The one pi-tui module A1 uses: pinned Pi's own copy.
 *
 * A1's `#pi-tui` alias resolves here, and this file re-exports the copy nested
 * inside pinned Pi — the same one Pi's extension loader hands to extensions, so
 * prototype patches and `instanceof` checks land on the classes A1 renders with.
 *
 * The alias cannot name that copy directly: Node rejects any package-imports
 * target containing a `node_modules` path segment (Invalid Package Target) and
 * silently falls through to the next entry, which resolves the hoisted root
 * copy and reintroduces the two-identity split this file exists to prevent. A
 * plain import specifier in a module carries no such restriction, so the hop
 * through this file is what makes the nested copy nameable from the manifest.
 *
 * When the nested copy is missing (a layout pinned Pi's shrinkwrap does not
 * produce), this import fails loudly at launch instead of silently rendering
 * without extension chrome. bin/module-identity.js reports the same condition
 * before the composition loads.
 *
 * This lives in bin/ (shipped, plain JS) because it names a path inside
 * node_modules, which the Pi API boundary policy rightly forbids ordinary
 * production code from doing.
 */
export * from "../node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-tui/dist/index.js";
