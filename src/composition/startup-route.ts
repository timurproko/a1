import { readFile } from "node:fs/promises";
import type { OwnedUiShellEngineOptions } from "../app/session-shell/index.js";
import type { PackagedReleaseNote, ReleaseNoteCatalog } from "../features/owned-ui/release-notes.js";
import type { ReleaseNoteClaim } from "../features/owned-ui/release-note-state.js";

type StartupRoute = NonNullable<OwnedUiShellEngineOptions["startupRoute"]>;

export interface StartupReleaseNoteOptions {
  readonly ownedSurfaces: boolean;
  /** Deterministic catalog and version seams for composition tests. */
  readonly releaseNotes?: ReleaseNoteCatalog;
  readonly packageVersion?: string;
  /** Without a profile there is nowhere to remember the note as seen, so it is never shown on startup. */
  readonly profileId?: string;
  readonly configDir: string;
}

export async function readPackageVersion(): Promise<string> {
  const manifest: unknown = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
  const version = (manifest as { version?: unknown })?.version;
  if (typeof version !== "string") throw new Error("A1 package version is unavailable");
  return version;
}

/**
 * The release notes bare A1 ships and the one note this version shows once per profile on startup:
 * the packaged catalog (or why it could not be read), the running version, and the claim that
 * marks the note seen after its route closes.
 */
export class StartupReleaseNote {
  readonly catalog: ReleaseNoteCatalog | null;
  readonly failure: unknown;
  readonly packageVersion: string | null;
  readonly #current: PackagedReleaseNote | null;
  readonly #claim: ReleaseNoteClaim | null;
  #acknowledgement: Promise<void> | null = null;

  static async load(options: StartupReleaseNoteOptions): Promise<StartupReleaseNote> {
    let catalog: ReleaseNoteCatalog | null = null;
    let failure: unknown;
    if (options.ownedSurfaces) {
      try {
        catalog = options.releaseNotes
          ?? await import("../features/owned-ui/release-notes.js").then(module => module.readPackagedReleaseNotes());
      } catch (error) { failure = error; }
    }
    const packageVersion = options.ownedSurfaces ? options.packageVersion ?? await readPackageVersion() : null;
    const current = packageVersion === null ? null : catalog?.current(packageVersion) ?? null;
    const profileId = options.profileId;
    const claim = current === null || profileId === undefined
      ? null
      : await import("../features/owned-ui/release-note-state.js").then(module => module.claimReleaseNote({
        configDir: options.configDir, profileId, version: current.version,
      }));
    return new StartupReleaseNote(catalog, failure, packageVersion, current, claim);
  }

  private constructor(
    catalog: ReleaseNoteCatalog | null,
    failure: unknown,
    packageVersion: string | null,
    current: PackagedReleaseNote | null,
    claim: ReleaseNoteClaim | null,
  ) {
    this.catalog = catalog;
    this.failure = failure;
    this.packageVersion = packageVersion;
    this.#current = current;
    this.#claim = claim;
  }

  /** The changelog route to present after the first frame, or undefined when there is no unseen note to show. */
  get startupRoute(): StartupRoute | undefined {
    const current = this.#current;
    const claim = this.#claim;
    if (current === null || claim === null) return undefined;
    return {
      route: "changelog",
      input: { document: current.markdown },
      onClosed: () => {
        this.#acknowledgement ??= claim.acknowledge();
        return this.#acknowledgement;
      },
    };
  }

  /** Waits for a pending acknowledgement; a failed one stays unseen and is never reported. */
  async settleAcknowledgement(): Promise<void> {
    await this.#acknowledgement?.catch(() => undefined);
  }

  async releaseClaim(): Promise<void> {
    await this.#claim?.release();
  }
}
