/** Never substitute the agent host's clipboard for a remote, multiplexed, or Herdr terminal user's clipboard. */
export function responseCopyDestination(env: NodeJS.ProcessEnv): "native" | "terminal" {
  return env.HC_TERMINAL_ID || env.TERM_PROGRAM === "herdr"
    || env.SSH_CONNECTION || env.SSH_CLIENT || env.SSH_TTY || env.TMUX || env.STY || env.WSL_DISTRO_NAME
    ? "terminal" : "native";
}
