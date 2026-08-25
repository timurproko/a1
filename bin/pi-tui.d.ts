/**
 * Types for the `#pi-tui` proxy (see ./pi-tui.js): the alias resolves to that
 * file, so TypeScript reads this declaration and follows it to pinned Pi's
 * nested pi-tui copy — the same module the proxy re-exports at runtime.
 */
export * from "../node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-tui/dist/index.js";
