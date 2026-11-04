/** Seconds a legacy clock-derived boot identity may drift and still name the same boot. */
const LEGACY_BOOT_TOLERANCE_SECONDS = 2;
const LEGACY_MACOS_BOOT = /^macos-boot:(\d+):\d+$/u;

/**
 * Mirrors the native host's boot matching rule for identities TypeScript compares itself.
 * Current kernel per-boot identifiers match exactly. Two legacy `macos-boot:<sec>:<usec>` records
 * match within the tolerance, because macOS shifts its recorded boot time on clock corrections.
 * A legacy record never matches a current-form identity here: only the native host can read the
 * current kernel boot time that proves it.
 */
export function sameBootIdentity(left: string, right: string): boolean {
  if (left === right) return true;
  const first = LEGACY_MACOS_BOOT.exec(left)?.[1];
  const second = LEGACY_MACOS_BOOT.exec(right)?.[1];
  return first !== undefined && second !== undefined
    && Math.abs(Number(first) - Number(second)) <= LEGACY_BOOT_TOLERANCE_SECONDS;
}
