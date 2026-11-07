import type { OwnedUiShellComponents, OwnedUiShellLazySelectorLoader } from "../../../contracts/owned-ui/index.js";
import { createPiShellEditor } from "../components/shell-editor-autocomplete.js";
import { createPiExtensionUiBridge } from "../components/shell-extension-ui.js";
import {
  createPiQueuedInputStatus,
  createPiShellFooter,
  createPiShellHeader,
  createPiShellLoadedResources,
  createPiShellStatus,
} from "../components/shell-footer-status.js";
import {
  createPiShellChangelog,
  createPiShellCollapsedChangelog,
  createPiShellHotkeys,
  createPiShellSessionInfo,
  renderPiShellCommandMessage,
  renderPiShellPackageUpdateNotice,
  renderPiShellReleaseUpdateBanner,
  renderPiShellReleaseUpdateNotice,
  renderPiShellStatusText,
} from "../components/shell-presenters-info.js";
import {
  createPiShellTranscriptComponent,
  isPiPromptStyleCompaction,
  renderPiShellStartupDiagnostic,
  renderPiShellTranscriptBlock,
} from "../components/shell-presenters-transcript.js";
import {
  createPiShellArmin,
  createPiShellAuthProviderSelector,
  createPiShellDialog,
  createPiShellEarendilAnnouncement,
  createPiShellExtensionSelector,
  createPiShellLoginDialog,
  createPiShellReloadBox,
  createPiShellSelector,
  createPiShellSkillsSelector,
  createPiShellTrustSelector,
  createPiShellUserMessageSelector,
} from "../components/shell-selectors-dialogs.js";
import {
  piShellHyperlink,
  piShellTruncateToWidth,
  piShellVisibleWidth,
  renderPiShellInstalledUpdateStatus,
} from "../components/shell-shared-facade.js";
import {
  SKILLS_COMMAND_NAME,
  findSkillByArgument,
  rewriteSkillsTunnelSubmission,
  skillPrompt,
  skillsFromCommands,
} from "../components/skills-command.js";
import { ProgramStatusReporter } from "../components/upstream/program-status-reporter.js";
import { workflowCommandNames } from "../engine/workflows.js";

/** The Pi components and helpers behind the shell's neutral component record. */
export function createPiShellComponents(loadLazySelectors: () => Promise<OwnedUiShellLazySelectorLoader>): OwnedUiShellComponents {
  return {
    editor: { create: createPiShellEditor },
    chrome: {
      header: createPiShellHeader,
      status: createPiShellStatus,
      footer: createPiShellFooter,
      queuedInput: createPiQueuedInputStatus,
      loadedResources: createPiShellLoadedResources,
      installedUpdateStatus: renderPiShellInstalledUpdateStatus,
      releaseUpdateBanner: renderPiShellReleaseUpdateBanner,
      programStatusReporter: (report, getSessionName, app) => new ProgramStatusReporter(report, getSessionName, app),
    },
    transcript: {
      component: createPiShellTranscriptComponent,
      renderBlock: renderPiShellTranscriptBlock,
      renderStartupDiagnostic: renderPiShellStartupDiagnostic,
      isPromptStyleCompaction: isPiPromptStyleCompaction,
    },
    info: {
      changelog: createPiShellChangelog,
      collapsedChangelog: createPiShellCollapsedChangelog,
      hotkeys: createPiShellHotkeys,
      sessionInfo: createPiShellSessionInfo,
      commandMessage: renderPiShellCommandMessage,
      statusText: renderPiShellStatusText,
      packageUpdateNotice: renderPiShellPackageUpdateNotice,
      releaseUpdateNotice: renderPiShellReleaseUpdateNotice,
      armin: createPiShellArmin,
      earendilAnnouncement: createPiShellEarendilAnnouncement,
      reloadBox: createPiShellReloadBox,
    },
    dialogs: {
      dialog: createPiShellDialog,
      selector: createPiShellSelector,
      extensionSelector: createPiShellExtensionSelector,
      authProviderSelector: createPiShellAuthProviderSelector,
      loginDialog: createPiShellLoginDialog,
      skillsSelector: createPiShellSkillsSelector,
      trustSelector: createPiShellTrustSelector,
      userMessageSelector: createPiShellUserMessageSelector,
      async shareProgress(runtime, message, style) {
        // Rationale: sharing is rare, so its progress surfaces stay off the startup graph.
        const surfaces = await import("../components/share-operation-dialog.js");
        return (style === "dialog" ? surfaces.createPiShellShareOperationDialog : surfaces.createPiShellOperationLoader)(runtime, message);
      },
      extensionUiBridge: createPiExtensionUiBridge,
      lazySelectors: loadLazySelectors,
    },
    text: {
      visibleWidth: piShellVisibleWidth,
      truncateToWidth: piShellTruncateToWidth,
      hyperlink: piShellHyperlink,
    },
    workflows: { commandNames: workflowCommandNames },
    skills: {
      commandName: SKILLS_COMMAND_NAME,
      fromCommands: skillsFromCommands,
      findByArgument: findSkillByArgument,
      rewriteTunnelSubmission: rewriteSkillsTunnelSubmission,
      prompt: skillPrompt,
    },
  };
}
