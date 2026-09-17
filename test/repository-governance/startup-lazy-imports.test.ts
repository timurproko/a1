import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { STARTUP_LAZY_IMPORT_MODULES, isStartupLazyImportModule, rewriteStartupLazyImports } from "../../scripts/pi/startup-lazy-imports.mjs";

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
