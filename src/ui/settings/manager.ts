import { ApplicationSettings } from "../../app/settings/index.js";
import { buildOwnedUiSettingsSections, type OwnedUiSettingsSection } from "./sections.js";

/** Settings-screen projection over the shared application settings authority. */
export class OwnedSettingsManager extends ApplicationSettings {
  sections(): readonly OwnedUiSettingsSection[] {
    const snapshot = this.snapshot();
    return buildOwnedUiSettingsSections(snapshot).map(section => ({
      ...section,
      entries: section.entries.map(entry => {
        if (entry.backend === "a1") return { ...entry, effectiveValue: this.valueOf(entry.id) };
        const label = snapshot.agentLabels[entry.id];
        return label === undefined ? entry : { ...entry, label };
      }),
    }));
  }
}
