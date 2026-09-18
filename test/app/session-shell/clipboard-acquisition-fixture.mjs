import { registerHooks } from "node:module";

/** Replaces only clipboard I/O imports before loading a real source or emitted helper. */
export function installClipboardAcquisitionFixture(mode, text, trace) {
  const backend = new URL("./clipboard-acquisition-backend-fixture.mjs", import.meta.url);
  backend.searchParams.set("fixture", JSON.stringify({ mode, text, trace }));
  const owner = (root, name, extension) => new URL(`../../../${root}/app/session-shell/${name}.${extension}`, import.meta.url).href;
  const readers = new Set([owner("src", "system-clipboard", "ts"), owner("dist", "system-clipboard", "js")]);
  const writers = new Set([owner("src", "response-copy-helper", "ts"), owner("dist", "response-copy-helper", "js")]);
  return registerHooks({ resolve(specifier, context, next) {
    const parent = context.parentURL && new URL(context.parentURL);
    if (parent) { parent.search = ""; parent.hash = ""; }
    const reader = readers.has(parent?.href);
    if ((specifier === "@mariozechner/clipboard" && (reader || writers.has(parent?.href))) || (specifier === "node:child_process" && reader)) {
      return { shortCircuit: true, url: backend.href };
    }
    return next(specifier, context);
  } });
}
