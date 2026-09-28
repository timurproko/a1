export interface ReleaseChange {
  readonly number: number;
  readonly title: string;
  readonly url: string;
}
export interface ReleaseNote { readonly version: string; readonly markdown: string }
export interface ReleaseNotesResource { readonly schema: "a1-release-notes-v1"; readonly releases: readonly ReleaseNote[] }
export const RELEASE_NOTES_SCHEMA: "a1-release-notes-v1";
export const MAX_RELEASE_NOTE_BYTES: number;
export function releaseNotePath(version: string): string;
export function parseReleaseNote(markdown: string, expectedVersion?: string): ReleaseNote;
export function renderReleaseNoteDraft(version: string, changes: readonly ReleaseChange[]): string;
export function buildReleaseNotesResource(directory: string): Promise<ReleaseNotesResource>;
export function validateReleaseNotesResource(value: unknown): ReleaseNotesResource;
