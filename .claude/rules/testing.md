---
paths:
  - "src/**/__tests__/**"
  - "src/tests.helpers.ts"
  - "vitest.config.ts"
---

# Testing

## Setup

- Runner: vitest (`vitest.config.ts`), `environment: 'jsdom'`, `globals: true`, `watch: false`.
- Include glob: `src/**/__tests__/**/*.spec.ts?(x)`. A test file must end in `.spec.ts` or `.spec.tsx`
  and live inside a `__tests__` folder or it is silently ignored.
- Globals come from `vitest/globals` (see `tsconfig.json` `types`). Existing tests use `describe`, `it`,
  `expect`, `beforeEach`, and the `vitest.fn()` global for mocks. Match that; do not import `vi` for consistency.
- DOM helpers: `@testing-library/react` - `renderHook`, `act`, `render`, `fireEvent`, `waitFor`.
- `src/tests.helpers.ts` exports `defer(fn, ms?)` for Promise-returning validators.
- The dev-mode console banner in `src/constants.ts` is suppressed when `process.env.VITEST_WORKER_ID` is set.

## Commands

```bash
pnpm test                                    # full suite, single run
pnpm test src/__tests__/validation.spec.tsx  # one file (positional filter)
pnpm test -t "should reset dependent"        # by test name
pnpm exec vitest --watch                     # watch mode
pnpm coverage                                # v8 coverage report (writes ./coverage, gitignored)
```

Baseline (8.15.0 plus unreleased working-tree changes): 25 files, 181 tests, all passing, about 4 seconds.

## Where tests live

| Folder | Scope | Style |
| --- | --- | --- |
| `src/__tests__/*.spec.tsx` | Hook behavior: `useHoneyForm`, `useChildHoneyForm`, `useMultiHoneyForms`, validators, filters, formatters, defaults, storage, errors. One file per feature area (`dependent-fields`, `skip-fields`, `promise-field-validators`, ...). | `renderHook` + `act` |
| `src/components/__tests__/*.spec.tsx` | `HoneyForm`, `HoneyFormDynamicField`, `ChildHoneyForm`, `MultiHoneyForms` rendered for real. | `render` + `fireEvent` + `waitFor` |

`describe` titles for component specs follow `Component [HoneyForm]: <topic>`; hook specs use a plain topic
(`'Dependent fields'`, `'Form submission'`). Add to the matching file before creating a new one.

## Patterns

Hook-level:

```tsx
type Form = { city: string; address: string };

const { result } = renderHook(() =>
  useHoneyForm<Form>({
    fields: {
      city: { type: 'string' },
      address: { type: 'string', dependsOn: 'city' },
    },
  }),
);

act(() => result.current.formFields.city.setValue('New York'));

expect(result.current.formFields.address.displayValue).toBeUndefined();
expect(result.current.formFields.address.props.value).toBe('');
```

Assert on the specific value property you mean: `displayValue` (what the input shows), `rawValue`
(post-filter), `normalizedValue` (post-validation, `undefined` when erred), `props.value` (always a string),
`errors` (use `toStrictEqual([{ type, message }])`).

Component-level:

```tsx
const onSubmit = vitest.fn();

const { getByTestId } = render(
  <HoneyForm fields={fields} onSubmit={onSubmit}>
    {({ formFields }) => (
      <>
        <input data-testid="name" {...formFields.name.props} />
        <button type="submit" data-testid="save">Save</button>
      </>
    )}
  </HoneyForm>,
);

fireEvent.change(getByTestId('name'), { target: { value: 'Apple' } });
fireEvent.click(getByTestId('save'));

await waitFor(() => expect(onSubmit).toHaveBeenCalled());
```

The library form element carries `data-testid="honey-form"`; child forms carry
`data-testid="child-honey-form"`.

Async:

- Promise validators: return `defer(() => result)` from `validator`, then `await waitFor(...)` on
  `errors` or `isValidating`. To test cancellation, read `signal.aborted` inside the deferred callback.
- `submitForm` and `validateForm` are async: `await act(() => result.current.submitForm())`.
- Field-level `config.onChange` always fires through `setTimeout`, and parent re-validation after a child
  change also uses `setTimeout(0)`. Wrap those assertions in `waitFor`.
- Async defaults: `defaults: () => Promise.resolve({...})`, then `waitFor` on `isFormDefaultsFetching`
  becoming false.

Storage:

- `form-storage.spec.tsx` clears `localStorage` and resets the query string in `afterEach`. Do the same in any
  new spec that sets `storage`, otherwise state leaks between tests. Encoded blobs are
  `btoa(encodeURI(JSON.stringify(values)))`; decode them in assertions instead of comparing raw strings.

Nested forms in tests: render children by mapping `formFields.items.displayValue`, give each a stable `key`
(the specs use an `id` field with a counter reset in `beforeEach`), and pass `formIndex` plus
`parentField={parentFormFields.items}` obtained from `useHoneyFormContext()`.

## What to cover when changing

| Change in | Add or update tests in |
| --- | --- |
| `field.ts` pipeline (filter, format, dependent, skip, scheduled) | `field-filters`, `field-formatters`, `dependent-fields`, `skip-fields`, `scheduled-field-validation` |
| `validators.ts` | `predefined-validators`, `required-field-validator`, `validation`, `field-types` |
| Async validation / abort | `promise-field-validators` |
| Submit, server errors, reset | `form-submission`, `errors`, `reset-form` |
| Defaults, `values` sync | `form-defaults`, `general` |
| Storage (`qs`/`ls`), unsubmitted form restore, `serializer`/`deserializer` | `form-storage` |
| Nested forms | `components/__tests__/honey-form.nested-forms.spec.tsx` (and the orphan file below) |
| Multi forms | `use-multi-honey-forms`, `components/__tests__/multi-honey-forms.spec.tsx` |
| Components / dynamic fields | `components/__tests__/honey-form.spec.tsx`, `dynamic-fields` |

## Known gaps

- `src/__tests__/use-honey-form.nested-forms.tsx` lacks the `.spec` suffix and never runs. Verified at
  8.15.0 that all 5 of its tests pass when included; renaming it to `use-honey-form.nested-forms.spec.tsx`
  is safe.
- No coverage thresholds are configured.
