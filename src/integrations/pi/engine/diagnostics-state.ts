import { gte, valid as validSemver } from "semver";
import type { OwnedUiDiagnostics } from "../../../contracts/owned-ui/index.js";

/** Bounded structured notices; acknowledgements never inspect terminal cells or touch Agent work. */
export class EngineDiagnostics {
  readonly #values: OwnedUiDiagnostics[] = [];
  #messages: string[] = [];
  #sequence = 0;
  get values(): readonly OwnedUiDiagnostics[] { return this.#values; }
  get messages(): readonly string[] { return this.#messages; }
  record(severity: OwnedUiDiagnostics["severity"], code: string, message: string, recoverable: boolean): OwnedUiDiagnostics {
    const diagnostic = { sequence: this.#sequence++, code, severity, message, recoverable };
    this.#values.push(diagnostic); if (this.#values.length > 100) this.#values.shift();
    this.#messages = [...this.#messages, message].slice(-8);
    return diagnostic;
  }
  clearCodes(codes: readonly string[]): boolean {
    const selected = new Set(codes);
    return this.#remove(diagnostic => selected.has(diagnostic.code));
  }
  acknowledgeClientVersion(version: string): boolean {
    if (validSemver(version) === null) return false;
    return this.#remove(diagnostic => {
      const target = diagnostic.code === "release-update-installed"
        ? /^Update (\S+) installed; restart to update\.$/u.exec(diagnostic.message)?.[1]
        : diagnostic.code === "release-update-blocked"
          ? /^Update (\S+) prepared; activation blocked\.$/u.exec(diagnostic.message)?.[1]
          : undefined;
      return target !== undefined && validSemver(target) !== null && gte(version, target);
    });
  }
  #remove(predicate: (diagnostic: OwnedUiDiagnostics) => boolean): boolean {
    const removed = new Set<string>();
    for (let index = this.#values.length - 1; index >= 0; index--) {
      const diagnostic = this.#values[index]!;
      if (predicate(diagnostic)) { removed.add(diagnostic.message); this.#values.splice(index, 1); }
    }
    if (removed.size === 0) return false;
    this.#messages = this.#messages.filter(message => !removed.has(message) || this.#values.some(diagnostic => diagnostic.message === message));
    return true;
  }
}
