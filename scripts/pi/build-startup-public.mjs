import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { build } from "esbuild";
import { createStartupPublicManifest, validateStartupPublicBaseline } from "./startup-public-artifact.mjs";
import { createStartupDescriptor, serializeStartupDescriptor } from "./startup-descriptor.mjs";
import { hasDynamicImport, isStartupLazyImportModule, pinnedDynamicImportPath, rewriteStartupLazyImports, validatePinnedDynamicImports } from "./startup-lazy-imports.mjs";

const root = process.cwd();
// Rationale: the summary is diagnostic noise for a routine build; the manifest on disk holds the same numbers.
const verbose = process.env.A1_BUILD_VERBOSE === "1";
const entry = "dist/integrations/pi/startup-public.js";
const temporary = "dist/integrations/pi/startup-public.generated.js";
const reportPath = "dist/integrations/pi/startup-public.manifest.json";
const descriptorPath = "dist/foundation/startup/startup-descriptor.js";
const external = ["@earendil-works/pi-tui", "@mariozechner/clipboard", "@silvia-odwyer/photon-node", "cross-spawn"];
const rewrittenConsumers = await rewriteGeneratedPublicImports();

const result = await build({
  absWorkingDir: root,
  entryPoints: [entry],
  outfile: temporary,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  treeShaking: true,
  minifySyntax: true,
  minifyWhitespace: true,
  keepNames: true,
  metafile: true,
  legalComments: "eof",
  external,
  plugins: [preservePinnedPiModuleContext(), inlineLazyPiModules()],
  banner: { js: [
    "import { createRequire as __createRequire } from 'node:module';",
    "import { configurePinnedPiPublicPackageEntry as __piConfigure, pinnedPiModuleUrl as __piModuleUrl, resolvePinnedPiImport as __piResolve } from '../../../bin/pinned-pi-public.js';",
    "__piConfigure(import.meta.resolve('@earendil-works/pi-coding-agent'));",
    "const require = __createRequire(import.meta.url);",
  ].join(" ") },
  logLevel: "warning",
});

const generated = await readFile(resolve(root, temporary));
await rename(resolve(root, temporary), resolve(root, entry));
const { manifest, serialized } = createStartupPublicManifest({
  generated,
  metafile: result.metafile,
  entry,
  external,
  rewrittenConsumers,
  licenses: await collectLicenses(Object.keys(result.metafile.inputs)),
});
const baseline = JSON.parse(await readFile(resolve(root, "config", "startup-graph-baseline.json"), "utf8"));
// Rationale: the manifest is written before the baseline verdict so a Pi upgrade can re-pin the totals from what was measured.
await writeFile(resolve(root, reportPath), serialized);
const baselineErrors = [
  ...validateStartupPublicBaseline(manifest, baseline),
  ...validatePinnedDynamicImports(await observePinnedDynamicImports(Object.keys(result.metafile.inputs)), baseline.pinnedDynamicImports),
];
if (baselineErrors.length > 0) throw new Error(baselineErrors.join("; "));
const descriptor = createStartupDescriptor({ artifact: manifest.output });
await writeFile(resolve(root, descriptorPath), serializeStartupDescriptor(descriptor));
if (verbose) process.stderr.write(`[startup-public] ${manifest.output.sha256} ${manifest.output.bytes} bytes from ${manifest.totals.files} normalized inputs; descriptor ${descriptor.identity}\n`);

function preservePinnedPiModuleContext() {
  const marker = "/node_modules/@earendil-works/pi-coding-agent/dist/";
  return {
    name: "preserve-pinned-pi-module-context",
    setup(buildContext) {
      buildContext.onLoad({ filter: /\.js$/ }, async args => {
        const normalized = args.path.replaceAll("\\", "/");
        const offset = normalized.lastIndexOf(marker);
        if (offset < 0) return undefined;
        const relativeModule = normalized.slice(offset + marker.length);
        const source = await readFile(args.path, "utf8");
        return {
          contents: source
            .replaceAll("import.meta.resolve(", "__piResolve(")
            .replaceAll("import.meta.url", `__piModuleUrl(${JSON.stringify(relativeModule)})`),
          loader: "js",
          resolveDir: dirname(args.path),
        };
      });
    },
  };
}

function inlineLazyPiModules() {
  return {
    name: "inline-lazy-pi-modules",
    setup(buildContext) {
      buildContext.onLoad({ filter: /.js$/ }, async args => {
        if (!isStartupLazyImportModule(args.path)) return undefined;
        return {
          contents: rewriteStartupLazyImports(await readFile(args.path, "utf8")),
          loader: "js",
          resolveDir: dirname(args.path),
        };
      });
    },
  };
}

async function observePinnedDynamicImports(inputs) {
  const observed = new Set();
  for (const input of inputs) {
    const pinned = pinnedDynamicImportPath(input);
    if (pinned === undefined || !input.endsWith(".js")) continue;
    if (hasDynamicImport(await readFile(resolve(root, input), "utf8"))) observed.add(pinned);
  }
  return observed;
}

async function collectLicenses(inputs) {
  const packages = new Map();
  for (const input of inputs) {
    const normalized = input.replaceAll("\\", "/");
    const marker = normalized.lastIndexOf("node_modules/");
    if (marker < 0) continue;
    const remainder = normalized.slice(marker + "node_modules/".length).split("/");
    const segments = remainder[0]?.startsWith("@") ? remainder.slice(0, 2) : remainder.slice(0, 1);
    if (segments.some(segment => !segment)) continue;
    const packageRoot = normalized.slice(0, marker + "node_modules/".length) + segments.join("/");
    const manifest = JSON.parse(await readFile(resolve(root, packageRoot, "package.json"), "utf8"));
    if (typeof manifest.name !== "string" || typeof manifest.version !== "string") {
      throw new Error(`startup dependency identity is invalid: ${packageRoot}`);
    }
    const license = typeof manifest.license === "string" ? manifest.license : "UNDECLARED";
    packages.set(`${manifest.name}@${manifest.version}`, { name: manifest.name, version: manifest.version, license });
  }
  return [...packages.values()];
}

async function rewriteGeneratedPublicImports() {
  const directory = resolve(root, "dist", "integrations", "pi", "components", "upstream");
  const files = await generatedJavaScriptFiles(directory);
  const rewritten = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (!source.includes('"@earendil-works/pi-coding-agent"')) continue;
    const target = relative(dirname(file), resolve(root, entry)).split(sep).join("/");
    const specifier = target.startsWith(".") ? target : `./${target}`;
    const output = source.replaceAll('"@earendil-works/pi-coding-agent"', `"${specifier}"`);
    await writeFile(file, output);
    rewritten.push(relative(root, file).split(sep).join("/"));
  }
  return rewritten.sort();
}

async function generatedJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const item of entries) {
    const path = resolve(directory, item.name);
    if (item.isDirectory()) files.push(...await generatedJavaScriptFiles(path));
    else if (item.isFile() && item.name.endsWith(".js")) files.push(path);
  }
  return files;
}

