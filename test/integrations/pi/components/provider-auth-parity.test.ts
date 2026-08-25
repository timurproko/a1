import { initTheme, OAuthSelectorComponent } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it, vi } from "vitest";
import {
  createPiShellAuthProviderSelector,
  type PiShellAuthProviderOption,
} from "../../../../src/integrations/pi/components/index.js";

interface ParityState {
  readonly name: string;
  readonly option: PiShellAuthProviderOption;
}

const STATES: readonly ParityState[] = [
  {
    name: "empty",
    option: { id: "oauth:openai-codex", providerId: "openai-codex", label: "OpenAI Codex", authType: "oauth" },
  },
  {
    name: "stored OAuth",
    option: {
      id: "oauth:openai-codex", providerId: "openai-codex", label: "OpenAI Codex", authType: "oauth",
      status: { type: "oauth", source: "stored" },
    },
  },
  {
    name: "stored API key",
    option: {
      id: "api_key:anthropic", providerId: "anthropic", label: "Anthropic", authType: "api_key",
      status: { type: "api_key", source: "stored credential" },
    },
  },
  {
    name: "environment API key",
    option: {
      id: "api_key:anthropic", providerId: "anthropic", label: "Anthropic", authType: "api_key",
      status: { type: "api_key", source: "ANTHROPIC_API_KEY" },
    },
  },
  {
    name: "other configured method",
    option: {
      id: "api_key:openai-codex", providerId: "openai-codex", label: "OpenAI Codex", authType: "api_key",
      status: { type: "oauth", source: "stored" },
    },
  },
];

function upstreamSelector(state: ParityState, selected: (value: string) => void) {
  const option = state.option;
  return new OAuthSelectorComponent("login", [{
    id: option.providerId,
    name: option.label,
    authType: option.authType,
    ...(option.status === undefined ? {} : { status: option.status }),
  }], (providerId, authType) => selected(`${authType}:${providerId}`), () => {});
}

function plainRows(component: { render(width: number): readonly string[] }, width: number): readonly string[] {
  return component.render(width).map(row => stripTerminalSequences(row));
}

describe("pinned provider authentication selector parity", () => {
  it.each(STATES)("matches untouched Pi for $name provider state", state => {
    initTheme("dark", false);
    const upstreamSelected = vi.fn();
    const ownedSelected = vi.fn();
    const upstream = upstreamSelector(state, upstreamSelected);
    const owned = createPiShellAuthProviderSelector("login", [state.option], ownedSelected, () => {});

    for (const width of [44, 100]) {
      expect(plainRows(owned, width), `${state.name}@${width}`).toEqual(plainRows(upstream, width));
    }
    upstream.handleInput("\r");
    owned.handleInput?.("\r");
    expect(ownedSelected).toHaveBeenCalledWith(state.option.id);
    expect(upstreamSelected).toHaveBeenCalledWith(state.option.id);
  });

  it("fails equivalence when configured status is intentionally dropped", () => {
    initTheme("dark", false);
    const configured = STATES.find(state => state.name === "stored OAuth")!;
    const upstream = upstreamSelector(configured, () => {});
    const mutated = createPiShellAuthProviderSelector("login", [{
      id: configured.option.id,
      providerId: configured.option.providerId,
      label: configured.option.label,
      authType: configured.option.authType,
    }], () => {}, () => {});
    expect(plainRows(mutated, 80)).not.toEqual(plainRows(upstream, 80));
    expect(plainRows(mutated, 80).join("\n")).toContain("unconfigured");
  });
});
