export type OrphanTagPlan = { action: "none" | "keep" | "delete"; reason: string };
export function planOrphanTagDeletion(input: {
  version: string;
  releases: readonly unknown[] | null;
  releasesComplete: boolean;
  tag: unknown | null;
  application: unknown | null;
  installer: unknown | null;
}): OrphanTagPlan;
