# A1

## Install

```sh
npm x -y -- @timurproko/a1-install                           # release
npm x -y -- @timurproko/a1-install --develop                 # develop
npm x -y -- @timurproko/a1-install --develop 107             # preview number
npm x -y -- @timurproko/a1-install --develop 0.1.8-dev.107   # exact preview
```

## Use

```sh
a1                                      # launch A1 (profile: ~/.a1/agent)
a1 help                                 # show all commands
a1 version                              # show the current and latest versions
a1 pi                                   # vanilla Pi oracle: ~/.pi/agent
```

Update:

```sh
a1 update                               # install the release
a1 update --develop                     # install develop
a1 update --develop 107                 # install preview 107
a1 update --develop 0.1.8-dev.107       # install that exact preview
a1 update --models                      # refresh A1's model catalogs
```

On interactive startup A1 checks, at most once a day, whether a newer release exists on its own channel and shows an `Update Available` notice with the command to run. It never installs anything. Turn it off with the `Update check` setting (Generic section), or set `A1_SKIP_VERSION_CHECK=1`; it is also skipped when `PI_OFFLINE` or `CI` is set, or when output is not a terminal. The check reads the public npm registry, or `npm_config_registry` when set.

## Extensions

```sh
a1 install npm:pi-mcp-adapter          # install a package
a1 remove npm:pi-mcp-adapter           # remove it (alias: a1 uninstall)
a1 list                                # list installed packages
```

Update:

```sh
a1 update --extensions                 # update every installed package
a1 update npm:pi-mcp-adapter           # update one
```

## Develop

```sh
npm ci                                  # install exact locked dependencies
npm run build                           # compile TypeScript and the process guardian into dist
npm start                               # build and launch a source `a1`
npm run start:pi                        # build and launch a source `a1 pi`
npm run test:fast                       # typecheck + fast suite (alias: npm test)
npm run test:full                       # complete non-physical suite
npm run doctor                          # report Node, npm, git, Rust, and dependency readiness
```

## Publish

### Develop

```sh
npm run develop                         # request the preview publish
```

### Release

```sh
npm run release -- patch               # 0.1.8-dev -> 0.1.8
npm run release -- minor               # 0.1.8-dev -> 0.2.0
npm run release -- major               # 0.1.8-dev -> 1.0.0
npm run release -- 0.4.0               # prepare an exact stable version
```

The command creates the draft, starts validation of its source, prints the progress
link, and waits. When validation passes it prints the draft link: edit the Pi-style
`## [version] - YYYY-MM-DD` changelog, then choose
GitHub's native **Publish release** button: that publishes both packages to npm. If
publication fails before npm, the Release returns to draft so you can publish it again.
