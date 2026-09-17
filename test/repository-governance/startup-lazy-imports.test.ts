import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { STARTUP_LAZY_IMPORT_MODULES, hasDynamicImport, isStartupLazyImportModule, pinnedDynamicImportPath, rewriteStartupLazyImports, validatePinnedDynamicImports } from "../../scripts/pi/startup-lazy-imports.mjs";

const piAiDist = "node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai/dist";

describe("generated public Pi startup lazy imports", () => {
  it("targets only the pinned pi-ai modules that hide imports behind variable specifiers", () => {
    expect(isStartupLazyImportModule(["D:", "repo", ...piAiDist.split("/"), "auth", "oauth", "load.js"].join("\\"))).toBe(true);
    expect(isStartupLazyImportModule(`/repo/${piAiDist}/api/bedrock-converse-stream.lazy.js`)).toBe(true);
    expect(isStartupLazyImportModule(`/repo/${piAiDist}/auth/oauth/openai-codex.js`)).toBe(false);
    expect(isStartupLazyImportModule("/repo/node_modules/@earendil-works/pi-coding-agent/dist/auth/oauth/load.js")).toBe(false);
  });

  it("folds OAuth flows into the artifact and keeps bedrock on the pinned Pi tree", () => {
    const source = [
      'return (await importOAuthModule("./openai-codex.ts")).openaiCodexOAuth;',
      'return (await importOAuthModule("./anthropic.ts")).anthropicOAuth;',
      'bedrockModuleOverride ?? (await importNodeOnlyApi("./bedrock-converse-stream.ts"))',
    ].join("\n");
    expect(rewriteStartupLazyImports(source)).toBe([
      'return (await import("./openai-codex.js")).openaiCodexOAuth;',
      'return (await import("./anthropic.js")).anthropicOAuth;',
      'bedrockModuleOverride ?? (await import(__piResolve("@earendil-works/pi-ai/api/bedrock-converse-stream")))',
    ].join("\n"));
  });

  it("rejects a pinned module whose lazy import shape drifted", () => {
    expect(() => rewriteStartupLazyImports('importOAuthModule("../flows/anthropic.ts")')).toThrow("startup lazy import was not rewritten");
    expect(() => rewriteStartupLazyImports('loadFlow("./anthropic.ts")')).toThrow("no longer matches the pinned Pi loader shape");
  });

  it("detects non-literal dynamic imports and identifies pinned Pi modules", () => {
    expect(hasDynamicImport('import(__rewriteRelativeImportExtension(specifier))')).toBe(true);
    expect(hasDynamicImport('await jiti.import(extensionPath, { default: true })')).toBe(true);
    expect(hasDynamicImport(`import("./literal.js"); import(\`./tpl.js\`); import('./single.js')`)).toBe(false);
    expect(pinnedDynamicImportPath(["D:", "repo", ...piAiDist.split("/"), "auth", "oauth", "load.js"].join("\\"))).toBe("@earendil-works/pi-ai/dist/auth/oauth/load.js");
    expect(pinnedDynamicImportPath("node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/loader.js")).toBe("@earendil-works/pi-coding-agent/dist/core/extensions/loader.js");
    expect(pinnedDynamicImportPath("node_modules/jiti/lib/jiti.mjs")).toBeUndefined();
  });

  it("fails the build for unhandled, stale, or unknown pinned dynamic imports", () => {
    const ledger = [
      { path: "@earendil-works/pi-ai/dist/auth/oauth/load.js", handling: "inlined" },
      { path: "@earendil-works/pi-ai/dist/env-api-keys.js", handling: "bare-specifier" },
    ] as const;
    expect(validatePinnedDynamicImports(new Set(ledger.map(entry => entry.path)), ledger)).toEqual([]);
    expect(validatePinnedDynamicImports(new Set(["@earendil-works/pi-ai/dist/auth/oauth/load.js", "@earendil-works/pi-ai/dist/api/new.lazy.js"]), ledger)).toEqual([
      "pinned Pi module @earendil-works/pi-ai/dist/api/new.lazy.js evaluates a non-literal import() that the startup artifact does not handle",
      "pinned dynamic import ledger entry @earendil-works/pi-ai/dist/env-api-keys.js no longer evaluates a non-literal import()",
    ]);
    expect(validatePinnedDynamicImports(new Set(), [{ path: "@earendil-works/pi-ai/dist/x.js", handling: "hope" as never }])).toEqual([
      "pinned dynamic import @earendil-works/pi-ai/dist/x.js has unknown handling hope",
      "pinned dynamic import ledger entry @earendil-works/pi-ai/dist/x.js no longer evaluates a non-literal import()",
    ]);
  });

  it("keeps the baseline ledger equal to the pinned Pi modules that evaluate non-literal imports", async () => {
    const baseline = JSON.parse(await readFile("config/startup-graph-baseline.json", "utf8"));
    const ledger = baseline.pinnedDynamicImports.map((entry: { path: string }) => entry.path).sort();
    expect(ledger).toEqual([...ledger].sort());
    for (const path of ledger) {
      const source = await readFile(`node_modules/${path.startsWith("@earendil-works/pi-ai/") ? `@earendil-works/pi-coding-agent/node_modules/${path}` : path}`, "utf8");
      expect(hasDynamicImport(source), path).toBe(true);
    }
    expect(ledger).toContain("@earendil-works/pi-ai/dist/auth/oauth/load.js");
    expect(ledger).toContain("@earendil-works/pi-ai/dist/api/bedrock-converse-stream.lazy.js");
  });

  it("rewrites every variable relative import in the pinned pi-ai modules", async () => {
    for (const module of STARTUP_LAZY_IMPORT_MODULES) {
      const source = await readFile(`${piAiDist}/${module}`, "utf8");
      expect(source, module).toMatch(/\b(?:importOAuthModule|importNodeOnlyApi)\("\.\//);
      const rewritten = rewriteStartupLazyImports(source);
      expect(rewritten).not.toMatch(/\b(?:importOAuthModule|importNodeOnlyApi)\("/);
      expect(rewritten).not.toMatch(/"\.\/[^"]+\.ts"/);
    }
  });
});
