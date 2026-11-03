import {
  PI_SETTING_EFFECTS,
  type PiSettingEffectDefinition,
  type PiSettingKey,
} from "../../src/integrations/pi/engine/settings-bridge.js";

export function settingsVisualInventoryViolations(
  presented: readonly string[],
  reviewed: Readonly<Partial<Record<PiSettingKey, PiSettingEffectDefinition>>> = PI_SETTING_EFFECTS,
): readonly string[] {
  const violations: string[] = [];
  for (const candidate of presented) {
    const definition = reviewed[candidate as PiSettingKey];
    if (definition === undefined) {
      violations.push(`${candidate}: missing visual classification`);
      continue;
    }
    const visual = definition.visual;
    if (!visual || visual.pinnedSurface.trim().length === 0) violations.push(`${candidate}: missing pinned visual source`);
    if (!visual || visual.evidence.trim().length === 0) violations.push(`${candidate}: missing independent visual evidence`);
    if (definition.hiddenInBare === true && visual?.class !== "hidden") violations.push(`${candidate}: hidden setting declares a visible frame`);
    if (definition.hiddenInBare !== true && visual?.class === "hidden") violations.push(`${candidate}: visible setting declares hidden evidence`);
  }
  return violations;
}
