// Pi's `@earendil-works/pi-ai` loads Node-only flow modules through a variable
// import specifier so bundlers cannot follow the edge. Inside the generated
// startup artifact that edge resolves relative to the bundle, where the module
// no longer exists. OAuth flows are small, so a literal `import()` lets esbuild
// fold them into the artifact while keeping evaluation lazy. Bedrock drags the
// AWS SDK along, so it stays on disk and resolves through the pinned Pi tree.
const oauthImportCall = /\bimportOAuthModule\(("\.\/[^"]+)\.ts"\)/g;
const bedrockImportCall = /\bimportNodeOnlyApi\("\.\/bedrock-converse-stream\.ts"\)/g;
const unrewrittenLazyImportCall = /\b(?:importOAuthModule|importNodeOnlyApi)\("\./;

export const STARTUP_LAZY_IMPORT_MODULES = Object.freeze([
  "auth/oauth/load.js",
  "api/bedrock-converse-stream.lazy.js",
]);

export function isStartupLazyImportModule(path) {
  const normalized = path.replaceAll("\\", "/");
  const marker = "/node_modules/@earendil-works/pi-ai/dist/";
  const offset = normalized.lastIndexOf(marker);
  if (offset < 0) return false;
  return STARTUP_LAZY_IMPORT_MODULES.includes(normalized.slice(offset + marker.length));
}

export function rewriteStartupLazyImports(source) {
  const rewritten = source
    .replace(oauthImportCall, (_match, specifier) => `import(${specifier}.js")`)
    .replace(bedrockImportCall, 'import(__piResolve("@earendil-works/pi-ai/api/bedrock-converse-stream"))');
  const remaining = rewritten.match(unrewrittenLazyImportCall);
  if (remaining) throw new Error(`startup lazy import was not rewritten: ${remaining[0]}`);
  return rewritten;
}
