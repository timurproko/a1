# A1

## Install

```sh
npx -y @timurproko/a1-install                           # release
npx -y @timurproko/a1-install --develop                 # develop
npx -y @timurproko/a1-install --develop 107             # preview number
npx -y @timurproko/a1-install --develop 0.1.8-dev.107   # exact preview
```

## Use

```sh
a1                                      # launch A1 (profile: ~/.a1/agent)
a1 help                                 # show all commands
a1 version                              # show the version
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
npm run release -- 0.4.0               # an exact stable version
```

Stable release waits for a maintainer to edit and manually merge the generated
`docs/releases/<version>.md` review PR before any immutable publication. That
reviewed Markdown ships in the package, supplies the GitHub Release body, opens
once after the matching stable version first starts, and remains available in bare
A1 through `/changelog`. `a1 pi` retains Pi's pinned changelog.
