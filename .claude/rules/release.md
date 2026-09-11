---
paths:
  - "package.json"
  - "pnpm-workspace.yaml"
  - ".github/workflows/*.yml"
  - "webpack.config.mjs"
  - "webpack-docs.config.js"
  - "tsconfig*.json"
---

# Release and versioning

## Versioning rules (observed from git history)

- Every user-visible change bumps `version` in `package.json` in the same commit as the code.
- Commit message format: `X.Y.Z - Imperative summary`, for example
  `8.15.0 - Skip reset dependent fields on setting form defaults`. Occasionally two commits share a version
  when the second is a follow-up before publishing.
- Minor bump for new options, behavior changes, dependency upgrades that change peer ranges.
  Patch bump for fixes and typing-only changes (`8.4.1`, `8.4.2`, `8.12.1`).
  Major bump for renames of public field/API properties (`8.0.0` renamed `cleanValue` to `normalizedValue`
  and `value` to `displayValue`).
- No git tags and no CHANGELOG file. The commit log is the changelog.
- README.md must be updated in the same commit when public API changes; it is copied into the npm package.

## Publish flow

`.github/workflows/publish.yml` runs on every push to the `release` branch:

1. `actions/checkout`, Node `24.16.0`, pnpm latest.
2. `pnpm install`.
3. `pnpm publish --access public --no-git-checks` with `NPM_TOKEN`. npm runs the `prepublishOnly` script
   first: `CI=1 pnpm clean && pnpm test && pnpm build`. A failing test blocks the publish.

So a release is:

```bash
# on main, after the version-bump commit is pushed
git push origin main:release
```

Nothing else tags or announces the version. If `release` has diverged, merge `main` into it instead of
force-pushing.

## Local pre-release check

```bash
CI=1 pnpm clean && pnpm test && pnpm build
pnpm publish --dry-run --no-git-checks     # inspect the file list
pnpm exec tsc --noEmit -p tsconfig.json    # expect only the known src/docs/index.tsx MDX error
pnpm exec eslint src                       # expect the known 42 baseline errors, nothing new
```

## Build outputs (`pnpm build`, `webpack.config.mjs`)

Three webpack configs share `src/index.ts` as the entry and `tsconfig.build.json`
(`declaration: true`, `sourceMap: true`, excludes `src/docs`, `__mocks__`, `__tests__`):

| Output | Mode | Export condition |
| --- | --- | --- |
| `dist/index.mjs` | production, ESM (`experiments.outputModule`) | `import`, `default` |
| `dist/index.cjs` | production, CommonJS | `require` |
| `dist/index.dev.cjs` | development, CommonJS | `development` |
| `dist/**/*.d.ts` | from ts-loader | `types` -> `dist/index.d.ts` |

The ESM config also copies `README.md` and `LICENSE` into `dist/`. `package.json` `files` publishes `dist`
only, excluding `__mocks__` and `__tests__`. Only `react` is marked external in webpack; anything else
imported from `src` (including `@react-hive/honey-utils`) is bundled.

`pnpm build-docs` (`webpack-docs.config.js`, CommonJS config, `tsconfig-docs.json`) builds the MDX
playground from `src/docs/index.tsx` into `dist-docs/`. It is experimental and not published.

## Dependencies

- Runtime: `@react-hive/honey-utils` (pinned exact). Same author and org; upgrade in lockstep when it adds
  helpers this package needs.
- Peers: `react` and `react-dom` `^19`, plus `@mdx-js/react` (only used by `src/docs`).
- Dev dependencies are pinned exact except `@types/react*`.
- pnpm 11 verifies the lockfile against supply-chain policies on install. `pnpm-workspace.yaml` carries a
  `minimumReleaseAgeExclude` entry for `ts-loader@9.6.2`. If `pnpm install` refuses a just-published version,
  add an exclusion there deliberately rather than disabling the check.
