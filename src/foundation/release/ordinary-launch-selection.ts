import { compare, valid as validSemver } from "semver";

interface OrdinaryLaunchRelease {
  readonly releaseId: string;
  readonly packageVersion: string;
}

interface ApprovedOrdinaryLaunchRelease extends OrdinaryLaunchRelease {
  readonly approval: string;
}

/**
 * Ordinary launch has no rollback authority: it may advance to its installed package, but an
 * older package installation must follow a newer approved active release instead of moving the
 * shared selector backward. Explicit update/rollback uses CohortStateStore.activate directly.
 */
export function selectOrdinaryLaunchReleaseId(
  candidate: OrdinaryLaunchRelease,
  active?: ApprovedOrdinaryLaunchRelease,
): string {
  if (!active || active.approval !== "approved") return candidate.releaseId;
  const candidateVersion = validSemver(candidate.packageVersion);
  const activeVersion = validSemver(active.packageVersion);
  if (!candidateVersion || !activeVersion) throw new Error("ordinary launch release versions must be valid semantic versions");
  return compare(activeVersion, candidateVersion) >= 0 ? active.releaseId : candidate.releaseId;
}
