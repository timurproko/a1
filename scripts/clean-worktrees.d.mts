export function decideWorktree(state: {
  path: string;
  dirty: boolean;
  isPrimary: boolean;
  pulls: { number: number; state: string }[];
  ancestorOfBase: boolean;
}): { action: "remove" | "keep"; reason: string };
