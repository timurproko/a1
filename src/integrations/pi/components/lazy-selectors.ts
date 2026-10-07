import type { SessionTreeNode } from "@earendil-works/pi-coding-agent";
import type { PiShellComponentPort } from "./shell-shared-facade.js";
import { componentPort, ensureTheme } from "./shell-shared-facade.js";
import type { ThinkingSelectorLevel } from "./upstream/components/thinking-selector.js";
import type { FilterMode } from "./upstream/components/tree-selector.js";

type ThinkingSelectorModule = typeof import("./thinking-selector-dialog.js");
type TreeSelectorModule = typeof import("./upstream/components/tree-selector.js");

export interface PiShellLazyThinkingSelectorOptions {
  readonly currentLevel: ThinkingSelectorLevel;
  readonly availableLevels: readonly ThinkingSelectorLevel[];
  readonly onSelect: (level: ThinkingSelectorLevel) => void;
  readonly onCancel: () => void;
  readonly onSelectAsDefault?: (level: ThinkingSelectorLevel) => void;
  readonly defaultLevel?: ThinkingSelectorLevel;
  readonly presentation?: {
    readonly profile: "bare";
    readonly cycleBinding: string | readonly string[];
  };
}

export interface PiShellLazyTreeSelectorOptions {
  readonly tree: readonly unknown[];
  readonly currentLeafId: string | null;
  readonly terminalHeight: number;
  readonly onSelect: (id: string) => void;
  readonly onCancel: () => void;
  readonly onLabelChange: (entryId: string, label: string | undefined) => void;
  readonly onCopy?: (text: string | undefined) => void;
  readonly initialSelectedId?: string;
  readonly initialFilterMode?: FilterMode;
}

export interface PiShellLazySelectorLoader {
  prepare(): Promise<void>;
  createThinking(options: PiShellLazyThinkingSelectorOptions): Promise<PiShellComponentPort>;
  createTree(options: PiShellLazyTreeSelectorOptions): Promise<PiShellComponentPort>;
}

export interface PiShellLazySelectorImports {
  readonly thinking: () => Promise<ThinkingSelectorModule>;
  readonly tree: () => Promise<TreeSelectorModule>;
}

const DEFAULT_IMPORTS: PiShellLazySelectorImports = {
  thinking: () => import("./thinking-selector-dialog.js"),
  tree: () => import("./upstream/components/tree-selector.js"),
};

/** Builds one idempotent selector loader; fulfilled, in-flight, and rejected imports remain shared. */
export function createPiShellLazySelectorLoader(imports: PiShellLazySelectorImports = DEFAULT_IMPORTS): PiShellLazySelectorLoader {
  let thinkingSelectorModule: Promise<ThinkingSelectorModule> | undefined;
  let treeSelectorModule: Promise<TreeSelectorModule> | undefined;
  const loadThinkingSelector = () => thinkingSelectorModule ??= imports.thinking();
  const loadTreeSelector = () => treeSelectorModule ??= imports.tree();

  return {
    async prepare(): Promise<void> {
      // Performance: allSettled observes background failures while retaining each rejected module for explicit route recovery.
      await Promise.allSettled([loadThinkingSelector(), loadTreeSelector()]);
    },

    async createThinking(options): Promise<PiShellComponentPort> {
      const { createPiShellThinkingSelector } = await loadThinkingSelector();
      return createPiShellThinkingSelector(
        options.currentLevel,
        options.availableLevels,
        options.onSelect,
        options.onCancel,
        options.onSelectAsDefault,
        options.defaultLevel,
        options.presentation,
      );
    },

    async createTree(options): Promise<PiShellComponentPort> {
      ensureTheme();
      const { TreeSelectorComponent } = await loadTreeSelector();
      const selector = new TreeSelectorComponent(
        [...options.tree] as SessionTreeNode[],
        options.currentLeafId,
        options.terminalHeight,
        options.onSelect,
        options.onCancel,
        options.onLabelChange,
        options.initialSelectedId,
        options.initialFilterMode,
      );
      if (options.onCopy) selector.onCopy = options.onCopy;
      return componentPort(selector);
    },
  };
}

/** Production selector loader, dynamically reached only after the first input-ready frame. */
export const piShellLazySelectors = createPiShellLazySelectorLoader();
