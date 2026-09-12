import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { COMMAND_OUTCOME_CASES } from "./command-outcome-cases.js";

interface Inventory {
  readonly upstream: { readonly commit: string };
  readonly advertised: readonly { readonly name: string }[];
  readonly hidden: readonly string[];
  readonly commandMessageParity: {
    readonly change: string;
    readonly pinnedVersion: string;
    readonly sourceMap: string;
    readonly caseSource: string;
    readonly producer: string;
    readonly test: string;
    readonly controllers: readonly string[];
    readonly presenters: readonly string[];
    readonly routes: Readonly<Record<string, { readonly methods: readonly string[]; readonly conditions: readonly string[] }>>;
    readonly interactiveExceptions: readonly { readonly id: string; readonly caseIds: readonly string[]; readonly authority: string }[];
    readonly supportingEvidence: readonly string[];
    readonly cliEvidence: { readonly test: string; readonly producer: string; readonly sourceMap: string; readonly routes: readonly string[]; readonly colorLevels: readonly number[] };
    readonly manualAcceptance: string;
  };
}

async function inventory(): Promise<Inventory> {
  return JSON.parse(await readFile("config/baselines/pinned-pi-command-workflow-outcomes.json", "utf8")) as Inventory;
}

describe("cumulative pinned command message inventory", () => {
  it("binds every supported route and fixture condition to the existing source authority", async () => {
    const baseline = await inventory();
    const evidence = baseline.commandMessageParity;
    expect(evidence.change).toBe("align-pi-command-messages");
    expect(baseline.upstream.commit).toBe("914cf1472e715297caa30db4b9535d534a9eb718");
    const packageRoot = "node_modules/@earendil-works/pi-coding-agent";
    const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
    expect(manifest.version).toBe(evidence.pinnedVersion);
    const sourceMap = JSON.parse(await readFile(join(packageRoot, "dist", evidence.sourceMap), "utf8"));
    const source = ts.createSourceFile("interactive-mode.ts", sourceMap.sourcesContent[0], ts.ScriptTarget.Latest, true);
    const mode = source.statements.find(statement => ts.isClassDeclaration(statement) && statement.name?.text === "InteractiveMode");
    if (mode === undefined || !ts.isClassDeclaration(mode)) throw new Error("Pinned InteractiveMode declaration missing");
    const methods = new Set(mode.members.filter(ts.isMethodDeclaration).map(method => method.name.getText(source)));
    const commands = [...baseline.advertised.map(entry => entry.name), ...baseline.hidden].sort();
    expect(Object.keys(evidence.routes).sort()).toEqual(commands);
    expect([...new Set(COMMAND_OUTCOME_CASES.map(entry => entry.command))].sort()).toEqual(commands);
    expect(new Set(COMMAND_OUTCOME_CASES.map(entry => entry.id)).size).toBe(COMMAND_OUTCOME_CASES.length);
    for (const [command, route] of Object.entries(evidence.routes)) {
      expect(route.methods.length, command).toBeGreaterThan(0);
      for (const method of route.methods) expect(methods.has(method), `${command}: ${method}`).toBe(true);
      expect([...new Set(COMMAND_OUTCOME_CASES.filter(entry => entry.command === command).map(entry => entry.condition))].sort(), command).toEqual([...route.conditions].sort());
    }
    for (const path of [evidence.caseSource, evidence.producer, evidence.test, ...evidence.controllers, ...evidence.presenters, ...evidence.supportingEvidence]) await access(path);
    expect(evidence.manualAcceptance).toContain("do not claim physical acceptance");
  });

  it("keeps the native missing-gh and recoverable-session exceptions explicit and narrow", async () => {
    const evidence = (await inventory()).commandMessageParity;
    expect(evidence.interactiveExceptions.map(entry => entry.id)).toEqual(["share-missing-gh", "recoverable-session-command"]);
    expect(evidence.interactiveExceptions[0]?.caseIds).toEqual(["share/missing"]);
    expect(evidence.interactiveExceptions[1]?.caseIds).toEqual(["new/failure", "new/non-error", "resume/failure", "resume/non-error", "import/failure", "import/non-error"]);
    for (const entry of evidence.interactiveExceptions) {
      expect(entry.authority).toMatch(/^https:\/\/github\.com\/timurproko\/a1\/pull\/(248|305)$/);
      for (const id of entry.caseIds) expect(COMMAND_OUTCOME_CASES.some(candidate => candidate.id === id), id).toBe(true);
    }
    const cli = evidence.cliEvidence;
    await access(cli.test); await access(cli.producer);
    await access(join("node_modules/@earendil-works/pi-coding-agent/dist", cli.sourceMap));
    expect(cli.routes).toContain("a1 update --models");
    expect(cli.routes).toContain("a1 pi update --models");
    expect(cli.colorLevels).toEqual([0, 1]);
  });
});
