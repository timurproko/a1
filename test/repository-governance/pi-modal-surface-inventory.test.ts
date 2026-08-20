import { access, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const inventoryPath = "openspec/changes/build-owned-pi-ui-foundation/evidence/modal-surface-inventory.json";
const REQUIRED_NODES = `editor.root settings.root settings.value-submenu settings.warnings settings.thinking settings.theme.single settings.theme.automatic settings.theme.light settings.theme.dark models.select models.scope models.scope.refreshing trust.project session.fork tree.root tree.summary-choice tree.summary-custom session.resume.current session.resume.all session.resume.rename session.resume.delete session.missing-cwd auth.login-type auth.login-provider auth.logout-provider auth.dialog.oauth auth.dialog.api-key auth.dialog.ambient auth.dialog.details auth.dialog.auth-url auth.dialog.device-code auth.dialog.select-prompt auth.dialog.manual-code auth.dialog.text-prompt auth.dialog.info auth.dialog.waiting auth.dialog.progress command.import-confirm operation.share-loader operation.reload-loader extension.select extension.confirm extension.input extension.editor extension.custom-editor extension.custom-replacement extension.overlay`.split(" ");
const REQUIRED_EDGES = `open.settings settings.value.open settings.warnings.open settings.thinking.open settings.theme.open settings.theme.automatic settings.theme.single-back settings.theme.light.open settings.theme.dark.open settings.close open.model model.close open.scoped-models scoped.refresh.start scoped.refresh.finish scoped.toggle scoped.persist scoped.cancel open.trust trust.close open.fork fork.close open.tree tree.summary.open tree.summary.cancel tree.custom.open tree.custom.cancel tree.navigate tree.custom.navigate tree.cancel open.resume resume.scope.all resume.scope.current resume.rename.open resume.rename.close resume.delete.open resume.delete.close resume.select resume.missing-cwd resume.missing-cwd.close resume.cancel open.login login.type.provider login.provider.oauth login.provider.api-key login.provider.ambient login.provider.back login.type.cancel login.dialog.details login.dialog.auth-url login.dialog.device-code login.dialog.select-prompt login.dialog.select-return login.dialog.manual-code login.dialog.text-prompt login.dialog.info login.dialog.waiting login.dialog.progress login.dialog.complete login.dialog.cancel open.logout logout.close open.import-confirm import-confirm.close open.share-loader share-loader.close open.reload-loader reload-loader.close extension.select.open extension.confirm.open extension.input.open extension.editor.open extension.custom-editor.open extension.custom.open extension.overlay.open settings.value.close settings.warnings.close settings.thinking.close settings.theme.light.close settings.theme.dark.close settings.theme.apply settings.theme.cancel-single settings.theme.cancel-automatic resume.rename.open-all resume.rename.close-all resume.delete.open-all resume.delete.close-all resume.select-all resume.cancel-all login.type.direct-oauth login.type.direct-api-key login.type.direct-ambient login.api.details login.api.select-prompt login.api.select-return login.api.manual-code login.api.text-prompt login.api.info login.api.progress login.api.complete login.api.cancel login.ambient.info login.ambient.close login.waiting.progress extension.select.close extension.confirm.close extension.input.close extension.editor.close extension.custom-editor.close extension.custom.close extension.overlay.close`.split(" ");
const REQUIRED_LIFECYCLE = [
  "open", "active", "complete-or-save", "back", "cancel", "failure", "focus-restoration", "resize", "dispose", "session-switch",
];
const FORBIDDEN_CONTROLLERS = new Set(["generic-selector", "generic-input", "generic-dialog", "generic-workflow"]);

type Node = {
  id: string;
  source: string;
  sourceAnchors: string[];
  heading: string;
  body: string;
  options: string[];
  borders: string;
  colors: string;
  instructions: string;
  focus: string;
  viewport: string;
  scrolling: string;
  destination: string;
  status: string;
  controller: string;
  acceptance: string;
  acceptanceEvidence: string[];
  parents: string[];
};
type Edge = {
  id: string;
  from: string;
  to: string;
  source: string;
  sourceAnchors: string[];
  trigger: string;
  stateMutation: string;
  replacement: string;
  result: string;
  restoration: string;
  acceptance: string;
  acceptanceEvidence: string[];
};
type Inventory = {
  schema: string;
  pinned: { version: string; commit: string };
  policy: {
    genericFixtureSatisfiesSpecializedSurface: boolean;
    flatTopLevelInventorySatisfiesCoverage: boolean;
    requiredNodeFields: string[];
    requiredEdgeFields: string[];
    requiredLifecycle: string[];
    acceptanceMapping: { node: string; edge: string };
  };
  sources: Record<string, string>;
  settingsInstances: string[];
  nodes: Node[];
  edges: Edge[];
  knownManualDivergences: Array<{ id: string; nodes: string[]; finding: string }>;
};

async function loadInventory(): Promise<Inventory> {
  return JSON.parse(await readFile(inventoryPath, "utf8")) as Inventory;
}

async function sourceContents(inventory: Inventory): Promise<Record<string, string>> {
  return Object.fromEntries(await Promise.all(Object.entries(inventory.sources).map(async ([id, path]) => [id, await readFile(path, "utf8")])));
}

function validateGraph(inventory: Inventory, sources: Record<string, string>, scenario: string): void {
  if (inventory.schema !== "a1-pinned-pi-modal-transition-graph-v2") throw new Error("invalid graph schema");
  if (inventory.pinned.version !== "0.84.2" || inventory.pinned.commit !== "914cf1472e715297caa30db4b9535d534a9eb718") throw new Error("stale pinned identity");
  if (inventory.policy.genericFixtureSatisfiesSpecializedSurface || inventory.policy.flatTopLevelInventorySatisfiesCoverage) throw new Error("generic or flat coverage enabled");
  if (JSON.stringify(inventory.policy.requiredLifecycle) !== JSON.stringify(REQUIRED_LIFECYCLE)) throw new Error("incomplete lifecycle policy");
  if (inventory.policy.acceptanceMapping.node !== "modal-node:<node-id>" || inventory.policy.acceptanceMapping.edge !== "modal-edge:<edge-id>") throw new Error("invalid acceptance mapping policy");

  const nodeIds = inventory.nodes.map(node => node.id);
  const edgeIds = inventory.edges.map(edge => edge.id);
  if (JSON.stringify([...nodeIds].sort()) !== JSON.stringify([...REQUIRED_NODES].sort())) throw new Error("incomplete modal nodes");
  if (JSON.stringify([...edgeIds].sort()) !== JSON.stringify([...REQUIRED_EDGES].sort())) throw new Error("incomplete modal edges");
  if (new Set(nodeIds).size !== nodeIds.length || new Set(edgeIds).size !== edgeIds.length) throw new Error("duplicate graph id");
  const knownNodes = new Set(nodeIds);
  const nodeAcceptance = new Set<string>();
  for (const node of inventory.nodes) {
    for (const field of ["heading", "body", "borders", "colors", "instructions", "focus", "viewport", "scrolling", "controller", "acceptance"] as const) {
      if (typeof node[field] !== "string" || node[field].trim() === "") throw new Error(`${node.id}: missing node field ${field}`);
    }
    if (!Array.isArray(node.options) || !Array.isArray(node.parents)) throw new Error(`${node.id}: missing node arrays`);
    if (!Array.isArray(node.acceptanceEvidence) || node.acceptanceEvidence.length < 3) throw new Error(`${node.id}: missing acceptance evidence`);
    for (const evidence of node.acceptanceEvidence) {
      if (evidence.startsWith("terminal:") && !scenario.includes(`name: "${evidence.slice(9)}"`)) throw new Error(`${node.id}: stale terminal evidence`);
      if (evidence.startsWith("test:") && !evidence.slice(5).startsWith("test/")) throw new Error(`${node.id}: invalid test evidence`);
    }
    if (FORBIDDEN_CONTROLLERS.has(node.controller)) throw new Error(`${node.id}: generic controller`);
    if (node.acceptance !== `modal-node:${node.id}` || nodeAcceptance.has(node.acceptance)) throw new Error(`${node.id}: invalid acceptance mapping`);
    nodeAcceptance.add(node.acceptance);
    if (!sources[node.source] || node.sourceAnchors.length === 0 || node.sourceAnchors.some(anchor => !sources[node.source]!.includes(anchor))) throw new Error(`${node.id}: stale source anchor`);
    if (!node.destination.startsWith("src/")) throw new Error(`${node.id}: invalid destination`);
  }
  const edgeAcceptance = new Set<string>();
  for (const edge of inventory.edges) {
    if (!knownNodes.has(edge.from) || !knownNodes.has(edge.to)) throw new Error(`${edge.id}: unknown graph endpoint`);
    for (const field of ["trigger", "stateMutation", "replacement", "result", "restoration", "acceptance"] as const) {
      if (typeof edge[field] !== "string" || edge[field].trim() === "") throw new Error(`${edge.id}: missing edge field ${field}`);
    }
    if (edge.acceptance !== `modal-edge:${edge.id}` || edgeAcceptance.has(edge.acceptance)) throw new Error(`${edge.id}: invalid acceptance mapping`);
    if (!Array.isArray(edge.acceptanceEvidence) || edge.acceptanceEvidence.length < 3) throw new Error(`${edge.id}: missing acceptance evidence`);
    for (const evidence of edge.acceptanceEvidence) {
      if (evidence.startsWith("terminal:") && !scenario.includes(`name: "${evidence.slice(9)}"`)) throw new Error(`${edge.id}: stale terminal evidence`);
      if (evidence.startsWith("test:") && !evidence.slice(5).startsWith("test/")) throw new Error(`${edge.id}: invalid test evidence`);
    }
    edgeAcceptance.add(edge.acceptance);
    if (!sources[edge.source] || edge.sourceAnchors.length === 0 || edge.sourceAnchors.some(anchor => !sources[edge.source]!.includes(anchor))) throw new Error(`${edge.id}: stale source anchor`);
  }
  for (const node of inventory.nodes) {
    const expectedParents = [...new Set(inventory.edges.filter(edge => edge.to === node.id).map(edge => edge.from))].sort();
    if (JSON.stringify(node.parents) !== JSON.stringify(expectedParents)) throw new Error(`${node.id}: stale parent mapping`);
  }
  for (const finding of inventory.knownManualDivergences) {
    if (!finding.finding || finding.nodes.length === 0 || finding.nodes.some(id => !knownNodes.has(id))) throw new Error(`${finding.id}: invalid finding mapping`);
  }
}

describe("pinned Pi modal transition graph", () => {
  it("maps every nested node, transition, specialized controller, and restoration target", async () => {
    const inventory = await loadInventory();
    const [sources, scenario] = await Promise.all([
      sourceContents(inventory),
      readFile("scripts/pi-terminal-parity/scenario.mjs", "utf8"),
    ]);
    validateGraph(inventory, sources, scenario);
    await Promise.all(inventory.nodes.map(node => access(node.destination)));

    const settingsIds = [...sources.settings!.matchAll(/\bid: "([^"]+)"/g)].map(match => match[1]!);
    expect(inventory.settingsInstances).toEqual(settingsIds);
    const byId = new Map(inventory.nodes.map(node => [node.id, node]));
    expect(byId.get("auth.login-type")).toMatchObject({ status: "corrected-pending-exhaustive-parity", controller: "ExtensionSelectorComponent authentication-method controller" });
    expect(byId.get("auth.dialog.select-prompt")).toMatchObject({ status: "corrected-pending-exhaustive-parity" });
    expect(inventory.edges.find(edge => edge.id === "login.provider.back")).toMatchObject({ to: "auth.login-type" });
    expect(inventory.edges.find(edge => edge.id === "tree.custom.cancel")).toMatchObject({ to: "tree.summary-choice" });
    expect(inventory.edges.find(edge => edge.id === "resume.rename.close-all")).toMatchObject({ to: "session.resume.all" });
  });

  it("rejects omitted nodes/edges, missing presentation, generic controllers, stale parents, and missing acceptance", async () => {
    const inventory = await loadInventory();
    const [sources, scenario] = await Promise.all([
      sourceContents(inventory),
      readFile("scripts/pi-terminal-parity/scenario.mjs", "utf8"),
    ]);
    const mutate = (change: (copy: Inventory) => void): Inventory => {
      const copy = structuredClone(inventory);
      change(copy);
      return copy;
    };
    expect(() => validateGraph(mutate(copy => { copy.nodes.pop(); }), sources, scenario)).toThrow(/incomplete modal nodes/);
    expect(() => validateGraph(mutate(copy => { copy.edges.pop(); }), sources, scenario)).toThrow(/incomplete modal edges/);
    expect(() => validateGraph(mutate(copy => { copy.nodes[0]!.heading = ""; }), sources, scenario)).toThrow(/missing node field heading/);
    expect(() => validateGraph(mutate(copy => { copy.nodes[0]!.controller = "generic-selector"; }), sources, scenario)).toThrow(/generic controller/);
    expect(() => validateGraph(mutate(copy => { copy.nodes[0]!.acceptance = ""; }), sources, scenario)).toThrow(/missing node field acceptance/);
    expect(() => validateGraph(mutate(copy => { copy.nodes[0]!.acceptanceEvidence = []; }), sources, scenario)).toThrow(/missing acceptance evidence/);
    expect(() => validateGraph(mutate(copy => { copy.edges[0]!.restoration = ""; }), sources, scenario)).toThrow(/missing edge field restoration/);
    expect(() => validateGraph(mutate(copy => { copy.nodes[0]!.parents = ["wrong.parent"]; }), sources, scenario)).toThrow(/stale parent mapping/);
    expect(() => validateGraph(mutate(copy => { copy.edges[0]!.to = "missing.node"; }), sources, scenario)).toThrow(/unknown graph endpoint/);
  });
});
