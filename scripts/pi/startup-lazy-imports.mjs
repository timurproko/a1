// Rationale: Pi's `@earendil-works/pi-ai` loads Node-only flow modules through a
// variable import specifier so bundlers cannot follow the edge. Inside the generated
// startup artifact that edge resolves relative to the bundle, where the module no
// longer exists. OAuth flows are small, so a literal `import()` lets esbuild fold them
// into the artifact while keeping evaluation lazy. Bedrock drags the AWS SDK along, so
// it stays on disk and resolves through the pinned Pi tree.
const oauthImportCall = /\bimportOAuthModule\(("\.\/[^"]+)\.ts"\)/g;
const bedrockImportCall = /\bimportNodeOnlyApi\("\.\/bedrock-converse-stream\.ts"\)/g;
const unrewrittenLazyImportCall = /\b(?:importOAuthModule|importNodeOnlyApi)\("\./;
const dynamicImportCall = /\bimport\(\s*(?!["'`])[^)\s]/g;
const pinnedPackageMarker = "node_modules/@earendil-works/";

export const STARTUP_LAZY_IMPORT_MODULES = Object.freeze([
  "auth/oauth/load.js",
  "api/bedrock-converse-stream.lazy.js",
]);

// Invariant: every pinned Pi module that evaluates a non-literal `import()` is named
// here with how the artifact keeps it correct. Loading a bare `node:` specifier or a
// user extension path works unchanged from inside the bundle; a relative specifier
// must be rewritten. An unknown site fails the build instead of a later `/login`.
export const PINNED_DYNAMIC_IMPORT_HANDLING = Object.freeze({
  "bare-specifier": "resolves a bare Node or package specifier that bundling does not change",
  "extension-path": "loads user extension files by absolute path at runtime",
  "inlined": "rewritten to literal relative imports that esbuild folds into the artifact",
  "pinned-tree": "rewritten to resolve through the pinned Pi package tree on disk",
});

export function isStartupLazyImportModule(path) {
  const normalized = path.replaceAll("\\", "/");
  const marker = "/node_modules/@earendil-works/pi-ai/dist/";
  const offset = normalized.lastIndexOf(marker);
  if (offset < 0) return false;
  return STARTUP_LAZY_IMPORT_MODULES.includes(normalized.slice(offset + marker.length));
}

export function rewriteStartupLazyImports(source) {
  let rewrites = 0;
  const rewritten = source
    .replace(oauthImportCall, (_match, specifier) => (rewrites += 1, `import(${specifier}.js")`))
    .replace(bedrockImportCall, () => (rewrites += 1, 'import(__piResolve("@earendil-works/pi-ai/api/bedrock-converse-stream"))'));
  const remaining = rewritten.match(unrewrittenLazyImportCall);
  if (remaining) throw new Error(`startup lazy import was not rewritten: ${remaining[0]}`);
  if (rewrites === 0) throw new Error("startup lazy import module no longer matches the pinned Pi loader shape");
  return rewritten;
}

export function pinnedDynamicImportPath(path) {
  const normalized = path.replaceAll("\\", "/");
  const offset = normalized.lastIndexOf(pinnedPackageMarker);
  return offset < 0 ? undefined : normalized.slice(offset + "node_modules/".length);
}

export function hasDynamicImport(source) {
  dynamicImportCall.lastIndex = 0;
  return dynamicImportCall.test(source);
}

export function validatePinnedDynamicImports(observed, ledger) {
  const errors = [];
  const expected = new Map((ledger ?? []).map(entry => [entry.path, entry.handling]));
  for (const [path, handling] of expected) {
    if (!(handling in PINNED_DYNAMIC_IMPORT_HANDLING)) errors.push(`pinned dynamic import ${path} has unknown handling ${handling}`);
  }
  for (const path of [...observed].sort()) {
    if (!expected.has(path)) errors.push(`pinned Pi module ${path} evaluates a non-literal import() that the startup artifact does not handle`);
  }
  for (const path of expected.keys()) {
    if (!observed.has(path)) errors.push(`pinned dynamic import ledger entry ${path} no longer evaluates a non-literal import()`);
  }
  return errors;
}
