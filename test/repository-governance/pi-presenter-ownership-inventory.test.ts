import { access, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const inventoryPath = "evidence/owned-pi-ui-foundation/presenter-ownership-inventory.json";
const slashCommandsPath = "node_modules/@earendil-works/pi-coding-agent/dist/core/slash-commands.js";
const REQUIRED_PRESENTER_IDS = [
  "document.header-resources",
  "document.user-assistant-tool",
  "document.custom-and-summary",
  "document.bash",
  "document.status",
  "document.error-warning",
  "document.managed-tool-status",
  "document.update-notifications",
  "document.session-info",
  "document.changelog-hotkeys",
  "document.command-inline-results",
  "document.hidden-command-components",
  "dock.pending-messages",
  "dock.status-indicators",
  "dock.extension-widgets",
  "dock.editor-footer",
  "replacement.selector-dialog-editor",
  "replacement.operation-loader",
] as const;
const REQUIRED_FIELDS = [
  "plane", "owner", "container", "insertion", "siblingOrder", "spacing", "style",
  "chronology", "coalescing", "scrollFollow", "lifetime",
] as const;

type Presenter = Record<(typeof REQUIRED_FIELDS)[number], string> & {
  id: string;
  sourceAnchors: string[];
  destination: string;
  implementationStatus: string;
};
type Command = {
  name: string;
  success: string[];
  cancel: string[];
  failure: string[];
  sourceAnchors: string[];
};
type Inventory = {
  schema: string;
  pinned: { version: string; commit: string; packageArtifact: string };
  policy: {
    planes: string[];
    requiredFields: string[];
    forbiddenOwners: string[];
    screenshotsAreAuthority: boolean;
    sourceAndIndependentProducerAreAuthority: boolean;
  };
  presenters: Presenter[];
  commands: Command[];
  hiddenCommands: Array<{ name: string; presenters: string[]; sourceAnchors: string[] }>;
  knownManualDivergences: Array<{ id: string; expectedPresenter: string; forbidden: string }>;
};

async function loadInventory(): Promise<Inventory> {
  return JSON.parse(await readFile(inventoryPath, "utf8")) as Inventory;
}

function validateInventory(inventory: Inventory, upstream: string, advertisedNames: string[]): void {
  if (inventory.schema !== "a1-pinned-pi-presenter-ownership-inventory-v1") throw new Error("invalid schema");
  if (inventory.pinned.version !== "0.84.2" || inventory.pinned.commit !== "914cf1472e715297caa30db4b9535d534a9eb718") {
    throw new Error("stale pinned identity");
  }
  if (inventory.policy.screenshotsAreAuthority || !inventory.policy.sourceAndIndependentProducerAreAuthority) {
    throw new Error("invalid evidence authority");
  }
  if (JSON.stringify(inventory.policy.requiredFields) !== JSON.stringify(REQUIRED_FIELDS)) throw new Error("missing required fields policy");
  const presenterIds = inventory.presenters.map(presenter => presenter.id);
  if (JSON.stringify([...presenterIds].sort()) !== JSON.stringify([...REQUIRED_PRESENTER_IDS].sort())) {
    throw new Error("incomplete presenter inventory");
  }
  if (new Set(presenterIds).size !== presenterIds.length) throw new Error("duplicate presenter id");
  const presenters = new Set(presenterIds);
  for (const presenter of inventory.presenters) {
    for (const field of REQUIRED_FIELDS) {
      if (typeof presenter[field] !== "string" || presenter[field].trim() === "") throw new Error(`${presenter.id}: missing ${field}`);
    }
    if (!inventory.policy.planes.includes(presenter.plane)) throw new Error(`${presenter.id}: invalid plane`);
    if (inventory.policy.forbiddenOwners.includes(presenter.owner)) throw new Error(`${presenter.id}: forbidden generic owner`);
    if (!presenter.destination.startsWith("src/")) throw new Error(`${presenter.id}: invalid destination`);
    if (presenter.sourceAnchors.length === 0 || presenter.sourceAnchors.some(anchor => !upstream.includes(anchor))) {
      throw new Error(`${presenter.id}: stale source anchor`);
    }
  }
  if (JSON.stringify(inventory.commands.map(command => command.name)) !== JSON.stringify(advertisedNames)) {
    throw new Error("advertised command coverage mismatch");
  }
  for (const command of inventory.commands) {
    for (const outcome of [command.success, command.cancel, command.failure]) {
      if (outcome.some(id => !presenters.has(id))) throw new Error(`${command.name}: unmapped outcome presenter`);
    }
    if (command.sourceAnchors.length === 0 || command.sourceAnchors.some(anchor => !upstream.includes(anchor))) {
      throw new Error(`${command.name}: stale source anchor`);
    }
  }
  if (JSON.stringify(inventory.hiddenCommands.map(command => command.name)) !== JSON.stringify(["debug", "arminsayshi", "dementedelves"])) {
    throw new Error("hidden command coverage mismatch");
  }
  for (const command of inventory.hiddenCommands) {
    if (command.presenters.some(id => !presenters.has(id)) || command.sourceAnchors.some(anchor => !upstream.includes(anchor))) {
      throw new Error(`${command.name}: invalid hidden command mapping`);
    }
  }
  for (const finding of inventory.knownManualDivergences) {
    if (!presenters.has(finding.expectedPresenter) || !inventory.policy.forbiddenOwners.includes(finding.forbidden)) {
      throw new Error(`${finding.id}: invalid manual finding mapping`);
    }
  }
}

describe("pinned Pi presenter ownership inventory", () => {
  it("maps every advertised result and visible presenter to its source-owned plane", async () => {
    const inventory = await loadInventory();
    const [upstream, slashCommands] = await Promise.all([
      readFile(inventory.pinned.packageArtifact, "utf8"),
      readFile(slashCommandsPath, "utf8"),
    ]);
    const advertisedNames = [...slashCommands.matchAll(/\{ name: "([^"]+)"/g)].map(match => match[1]!);
    validateInventory(inventory, upstream, advertisedNames);
    await Promise.all(inventory.presenters.map(presenter => access(presenter.destination)));

    const byId = new Map(inventory.presenters.map(presenter => [presenter.id, presenter]));
    expect(byId.get("document.status")).toMatchObject({ plane: "persistent-document", container: "chatContainer" });
    expect(byId.get("document.error-warning")).toMatchObject({ plane: "persistent-document", container: "chatContainer" });
    expect(byId.get("dock.status-indicators")).toMatchObject({ plane: "prompt-dock", container: "statusContainer" });
    expect(byId.get("replacement.selector-dialog-editor")).toMatchObject({ plane: "active-replacement" });
    expect(inventory.commands.find(command => command.name === "session")?.success).toEqual(["document.session-info"]);
  });

  it("rejects omissions, generic owners, raw fallbacks, and unmapped command outcomes", async () => {
    const inventory = await loadInventory();
    const [upstream, slashCommands] = await Promise.all([
      readFile(inventory.pinned.packageArtifact, "utf8"),
      readFile(slashCommandsPath, "utf8"),
    ]);
    const names = [...slashCommands.matchAll(/\{ name: "([^"]+)"/g)].map(match => match[1]!);
    const mutate = (change: (copy: Inventory) => void): Inventory => {
      const copy = structuredClone(inventory);
      change(copy);
      return copy;
    };
    expect(() => validateInventory(mutate(copy => { copy.presenters.pop(); }), upstream, names)).toThrow(/incomplete presenter/);
    expect(() => validateInventory(mutate(copy => { copy.presenters[0]!.owner = "generic-workflow-bucket"; }), upstream, names)).toThrow(/forbidden generic owner/);
    expect(() => validateInventory(mutate(copy => { copy.presenters[0]!.style = ""; }), upstream, names)).toThrow(/missing style/);
    expect(() => validateInventory(mutate(copy => { copy.commands[0]!.success = ["raw-object-fallback"]; }), upstream, names)).toThrow(/unmapped outcome presenter/);
  });
});
