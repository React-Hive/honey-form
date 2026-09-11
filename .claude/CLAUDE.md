# @react-hive/honey-form

TypeScript form-state library for React 19. Public surface: hooks (`useHoneyForm`, `useChildHoneyForm`,
`useMultiHoneyForms`) plus thin components (`HoneyForm`, `ChildHoneyForm`, `MultiHoneyForms`, dynamic-field
helpers). Everything runs on one internal engine: `src/hooks/internal/use-form.ts`. Published to npm from the
`release` branch. Current line is 8.x.

Deeper docs. They are path-scoped rules that auto-load when you read matching files; read them up front when the task touches that area:

- `.claude/rules/architecture.md` - module map, field value lifecycle, change/validation pipeline, nested forms,
  storage, multi forms. Read before editing `src/field.ts`, `src/helpers.ts`, `src/validators.ts`, or
  anything under `src/hooks/`.
- `.claude/rules/testing.md` - vitest setup, test patterns, known coverage gaps. Read before adding tests.
- `.claude/rules/release.md` - version bump rules, commit message format, publish flow, build outputs.

## Commands

pnpm only (lockfile is `pnpm-lock.yaml`), Node 24.

```bash
pnpm install
pnpm test                                   # vitest, single run (watch is disabled in vitest.config.ts)
pnpm test src/__tests__/fields.spec.tsx     # one file
pnpm coverage                               # v8 coverage report -> coverage/ (gitignored)
pnpm exec vitest --watch                    # watch mode
pnpm build                                  # webpack -> dist/ (ESM, CJS, dev CJS, .d.ts, README, LICENSE)
pnpm clean                                  # rm -rf dist coverage
pnpm exec tsc --noEmit -p tsconfig.json     # type check (no npm script exists)
pnpm exec eslint src                        # lint (no npm script exists)
pnpm exec prettier --check src              # formatting
pnpm build-docs                             # experimental MDX playground -> dist-docs/
```

Baseline (8.15.0 plus unreleased working-tree changes): 25 test files / 175 tests pass. `tsc` reports one pre-existing error in
`src/docs/index.tsx` (no type declarations for `.mdx`; `src/docs` is excluded from the library build).
ESLint reports 42 pre-existing errors, mostly `no-explicit-any` and `ban-ts-comment`. Do not add new ones.
Do not mass-fix old ones inside an unrelated change.

## Layout

```
src/
  index.ts              barrel: re-exports filters, formatters, hooks, types, helpers, validators, components
  constants.ts          __DEV__, NPM_PACKAGE_NAME, HONEY_FORM_ERRORS, HONEY_FORM_LS_PREFIX, dev-mode banner
  init.ts               localStorage capability probe (evaluated once at import)
  field.ts              field creation + pure "getNext*" state transitions + the per-change pipeline
  validators.ts         built-in type validators (string/numeric/number/email), required/min/max, date-range factories
  filters.ts            createHoneyFormNumericFilter, createHoneyFormNumberFilter
  formatters.ts         createHoneyFormSplitStringFormatter, createHoneyFormNumberFormatter
  helpers.ts            iteration helpers, field type guards, submit-value extraction, child-form registry, qs/ls storage
  types/                all public types; types.ts is the big one (configs, options, callbacks), api.types.ts is HoneyFormApi
  hooks/
    internal/use-form.ts            the engine: state, refs, setFormValues/validateForm/submitForm/resetForm
    internal/use-form-defaults.ts   sync/async defaults, storage read, abort on context change
    internal/use-unsubmitted-form.ts  detect + restore unsubmitted form from localStorage
    use-honey-form.ts               root form hook; registers into MultiHoneyForms context
    use-child-honey-form.ts         child form hook; registers into parentField.__meta__.childForms
    use-multi-honey-forms.ts        collection of form APIs with submitForms/validateForms/resetForms
  components/           HoneyForm(+Provider/Form/DynamicField), ChildHoneyForm(+...), MultiHoneyForms
  __tests__/            hook-level specs; components/__tests__/ holds component specs
  docs/                 MDX playground (webpack-docs.config.js), not part of the package
  tests.helpers.ts      defer() for promise validators (not exported from the package; only its .d.ts is emitted into dist)
```

`examples/` holds only an EJS template and is vestigial. `dist/` is gitignored but usually present locally.

## Conventions

- Formatting is Prettier: single quotes, semicolons, 100 columns, `arrowParens: avoid`, 2-space indent.
  Run `pnpm exec prettier --write <files>` on anything you touch.
- File names are kebab-case. Components use a role suffix: `honey-form.provider.tsx`, `honey-form.form.tsx`,
  `honey-form-dynamic.field.tsx`. Every folder has an `index.ts` barrel; new exports must flow through
  `src/index.ts` to reach `dist/index.d.ts`.
- Type names are prefixed `HoneyForm*`, `ChildHoneyForm*`, `MultiHoneyForms*`. Generic parameter order is
  `<Form, FieldName, FormContext, FieldValue>` for field-level types and
  `<ParentForm, ParentFieldName, Form, FormContext>` for form-level types that know about a parent.
- Use `import type` for type-only imports. Keep JSDoc (`@param`, `@returns`, `@remarks`, `@default`) on every
  exported type and function; the JSDoc in `src/types/` is the effective API reference.
- Field objects are treated as immutable: functions named `getNext*` return new objects and never mutate the
  input. The one intentional exception is `field.__meta__` (`validationScheduled`, `childForms`), which is
  shared mutable metadata.
- Whenever form fields change inside `use-form.ts`, set both `formFieldsRef.current = next` and
  `setFormFields(next)`. Callbacks read the ref, React reads the state; they must never diverge.
- User-facing messages go through `warning()` / `error()` in `src/helpers.ts` or `HONEY_FORM_ERRORS` in
  `src/constants.ts`, prefixed `[@react-hive/honey-form]:`. Dev-only checks are wrapped in `if (__DEV__)`.
- Runtime helpers come from `@react-hive/honey-utils` (`assert`, `invokeIfFunction`, `isString`, `isNil`,
  `isNilOrEmptyString`, `noop`, `runParallel`, ...). Reach for it before writing a new utility.
- React 19 idioms are used on purpose: `<Context value={...}>` instead of `Context.Provider`, `ref` as a normal
  prop, `React.memo` via `genericMemo` to keep generics. Do not "modernize" backwards.
- `tsconfig.json` has `strict: false`. Do not rely on strict-null narrowing; several `@ts-expect-error` comments
  around child-form generics are known and tracked as TODOs, not bugs to silently remove.

## Gotchas

- README.md is the user-facing API reference and ships inside the npm package. It was brought back in sync with
  the code after 8.15.0; treat `src/types/*.ts` as the source of truth and update README in the same commit as
  any public API change.
- Form-level `mode` option in `FormOptions` is declared but not implemented (marked `TODO: IMPLEMENT`). Field-level
  `mode` (`'change' | 'blur' | 'submit'`) is implemented.
- `normalizedValue` is `undefined` whenever a field has errors. Submit values use `normalizedValue` for
  interactive fields, `displayValue` for everything else (or when `submitFormattedValue` is true).
- `min`/`max` mean value bounds for `type: 'number'` and length bounds for `string`, `email`, `numeric`.
  `numeric` stays a digits-only string; `number` is normalized to a JS number (thousand separators stripped).
- Child field changes re-validate the parent field through `setTimeout(..., 0)`. Tests that assert on the parent
  after a child change need `waitFor`.
- Async validators receive `signal`; a previous in-flight validation for the same field is aborted on every new
  run. Rejections named `CanceledError` (axios) are swallowed; any other rejection becomes an `invalid` error
  with the rejection message.
- Using `storage` without `name` throws. Only root forms persist; child forms cannot pass `name`, `storage`, or
  `readDefaultsFromStorage`.
- `src/__tests__/use-honey-form.nested-forms.tsx` is missing the `.spec` suffix, so vitest never runs it
  (the include glob is `src/**/__tests__/**/*.spec.ts?(x)`). Its 5 tests pass when included.
- `@mdx-js/react` is listed as a peerDependency but is only used by `src/docs`.
- Every feature or fix commit also bumps `version` in package.json and uses the message format
  `X.Y.Z - Summary`. See `.claude/rules/release.md` before committing.
