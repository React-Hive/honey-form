---
paths:
  - "src/**/*.{ts,tsx}"
---

# Architecture

How `@react-hive/honey-form` is put together, from the engine hook down to a single field's value lifecycle.
Function names are given instead of line numbers; use grep.

## 1. Module map

| Module | Role | Depends on |
| --- | --- | --- |
| `src/hooks/internal/use-form.ts` | The engine. Owns all React state and refs, builds the `HoneyFormApi` object. | field, helpers, use-form-defaults, use-unsubmitted-form |
| `src/hooks/use-honey-form.ts` | Root form. Resolves initial fields from `fields` config + defaults, registers with `MultiHoneyFormsContext`. | use-form, field, helpers, components (context only) |
| `src/hooks/use-child-honey-form.ts` | Child form bound to a parent `nestedForms` field. Seeds defaults from `parentField.displayValue[formIndex]`, registers in `parentField.__meta__.childForms`. | use-form, field, helpers |
| `src/hooks/use-multi-honey-forms.ts` | Holds an array of `HoneyFormApi` and fans out validate/submit/reset. | types only |
| `src/field.ts` | `createFormField` plus every pure state transition (`getNext*`), validator execution, dependent/skip/scheduled processing, and `getNextFieldsState` (the per-change pipeline). | validators, helpers |
| `src/validators.ts` | Regex validators per interactive type, `required`, `min`/`max`/`minMax` (value and length), date-range validator factories. | helpers (`isObjectField`) |
| `src/helpers.ts` | Iteration helpers, field type guards, `getFormValues` / `getFormSubmitValues` / `getFormErrors`, child-form registry, qs/ls serialization and storage. | constants, init |
| `src/filters.ts`, `src/formatters.ts` | Public factories users pass as `filter` / `formatter`. | types only |
| `src/components/*` | Context providers and render-prop wrappers around the hooks. No logic of their own beyond `onSubmit` wiring and add/remove of dynamic fields. | hooks |
| `src/types/*` | All types. `types.ts`: execution context, validator/filter/formatter signatures, field configs, `FormOptions`/`HoneyFormOptions`/`ChildHoneyFormOptions`, callback types. `api.types.ts`: `HoneyFormApi`, `MultiHoneyFormsApi`. `field.types.ts`: field type unions, `HoneyFormFieldMode`, error types, DOM prop types. | - |

Everything in `src/index.ts` is public, including `helpers.ts`. Renaming an exported helper is an API change.

## 2. The engine: `useForm`

`useForm<ParentForm, ParentFieldName, Form, FormContext>(options: FormOptions)` is generic over an optional
parent so the same code serves root and child forms. Key pieces:

- **State:** `formFields` (React state, the only thing that triggers renders) and `formState`
  (`isValidating`, `isSubmitting`).
- **Refs mirroring state:** `formFieldsRef`, `formValuesRef`, `formSubmitValuesRef`, `formErrorsRef`,
  `isFormDirtyRef`, `isFormValidRef`, `isFormSubmittedRef`, `totalFormSubmissionsRef`,
  `formFieldsValidationControllerRef` (per-field `AbortController`), debounce timer refs.
- **Invariant:** every mutation does `formFieldsRef.current = next; setFormFields(next);`. Callbacks created
  with empty `useCallback` deps read the ref, so they stay stable and still see fresh data.
- **API object:** returned with getters (`get formFields()`, `get isFormDirty()`, ...) backed by the refs. This
  is deliberate: `MultiHoneyForms` stores API objects in its own state, and getters keep them live without
  re-registering.
- **Initial fields:** `initialFormFieldsStateResolver` is injected by the public hooks. Root forms map
  `fields` config through `createFormField`, applying `formDefaultsRef` over `fieldConfig.defaultValue`.
  Child forms additionally prefer the value found in the parent field at `formIndex`.
- **`resetForm(newDefaults?)`** merges new defaults into `formDefaultsRef`, aborts in-flight validators, and
  re-runs the resolver. It also removes the localStorage entry when `storage === 'ls'`.

Two internal wrappers sit around every change:

- `formChangeProcessor(initiatorFieldName, fn, skipOnChange)` runs `fn`, persists submit values to storage
  (root forms only), then invokes form-level `onChange(submitValues, { formFields, formValues, formContext,
  parentField, formErrors })` with debounce from the field's `onChangeDebounce` or the form's.
- `formFieldChangeProcessor(fieldName, fn)` runs `fn`, then schedules the field-level `config.onChange`
  with `normalizedValue` (or child-form values for `nestedForms`) through `setTimeout`, always, even at 0ms.

## 3. Field model

### Field types

| Kind | `type` values | Bound props | Notes |
| --- | --- | --- | --- |
| Interactive | `string`, `numeric`, `number`, `email` | `field.props` (spread onto `<input>`) | Only kind that supports `filter`, `formatter`, `formatOnBlur`, `submitFormattedValue`, `trimStart`, `min`/`max`. |
| Passive | `checkbox`, `radio`, `file` | `field.passiveProps` | `checkbox` binds `checked`; `file` reads `e.target.files`; `radio` reads `e.target.value` and expects `value` set on the input by the user. |
| Object | `object` | none, call `field.setValue(obj)` | `allowEmptyArray`, `allowEmptyArrayValues` affect `required`. |
| Nested forms | `nestedForms` | none | Value is an array of child forms. See section 7. |
| Polymorphic | `polymorphic` | none | Config exists, no built-in type validator; only `required` and custom `validator` run. |

Type guards live in `helpers.ts`: `isInteractiveField`, `isPassiveField`, `isObjectField`,
`isNestedFormsField`, `isPolymorphicField`. Use them instead of comparing `config.type` strings.

### Props produced for interactive fields

`getInteractiveFormFieldProps` in `field.ts` builds: `ref`, `type` (only for email/checkbox/radio/file),
`name`, `value` (string, `''` for nil), `inputMode` (`numeric`, `decimal`, `email`), `onChange`
(validates only when `mode === 'change'`, formats unless `formatOnBlur`), `onBlur` (added when
`mode === 'blur'` or `formatOnBlur`; skipped for `readOnly` inputs), `aria-required`, `aria-invalid`,
`aria-busy`. `config.props` is spread last and can override any of these.

### Value lifecycle on a field object

| Property | Meaning | Set by |
| --- | --- | --- |
| `defaultValue` | Effective default (form-level `defaults` win over `fieldConfig.defaultValue`; either may be a lazy `() => value`). | `createFormField` |
| `rawValue` | Value after `trimStart` and `filter`, before `formatter`. | `getNextFormFieldState` |
| `displayValue` | `rawValue` after `formatter`. Bound to `props.value`. `formValues` is a map of these. | `getNextFormFieldState` |
| `normalizedValue` | Type-normalized value (`number` -> JS number, commas stripped). Present only when validation passed; `undefined` when `errors.length > 0` or when validation was skipped via `getNextErrorsFreeField`. | `getNextValidatedField`, `getNextErredField` |
| `initialNormalizedValue` | Snapshot at creation, used for `isDirty`. | `createFormField` |
| `errors` | `HoneyFormFieldError[]`, `type` in `required`, `invalid`, `min`, `max`, `minMax`, `server`. | validators, `addErrors`, `setFormErrors` |
| `isDirty` | `initialNormalizedValue !== normalizedValue` after a change. | `getNextFieldsState` |
| `isValidating` | True while a Promise validator is pending. | `getNextAsyncValidatingField` / `getNextAsyncValidatedField` |
| `__meta__` | `{ formFieldsRef, validationScheduled, childForms }`. Mutable on purpose. | `createFormField`, `scheduleFieldValidation`, child-form registry |

Field methods (`setValue`, `pushValue`, `removeValue`, `resetValue`, `addError(s)`, `clearErrors`, `validate`,
`focus`, `getChildFormsValues`) are closures over the engine callbacks passed into `createFormField`.
`resetValue` sets the default with `dirty: false` and does not push into child forms.

### Submit values vs form values

- `getFormValues(fields)` returns `displayValue` for every field. This is `api.formValues`.
- `getFormSubmitValues(parentField, formContext, fields)` returns `normalizedValue` for interactive fields
  (unless `submitFormattedValue`), `displayValue` for everything else, recurses into registered child forms,
  and drops fields whose `skip()` returns true. This is `api.formSubmitValues` and what `onSubmit` receives.

## 4. The change pipeline

`setFieldValue(fieldName, value, { validate, dirty, format, shouldSetChildFormsValues })` in `use-form.ts`
calls `getNextFieldsState` in `field.ts`, which does, in order:

1. `trimStart` (interactive fields, default on) then `config.filter`.
2. `resetDependentFields` - every other field whose `dependsOn` matches (string, array, or predicate
   `(initiatorFieldName, value, ctx) => boolean`) is reset to `undefined`, or to its default when
   `resetOnDependencyToDefault` is true. Recurses through chains, guarding against cycles with
   `initiatorFieldName`.
3. If `validate`: `executeFieldValidator` (section 5). Else `getNextErrorsFreeField`. `validate` is forced
   true when the field already has errors, and forced false when `config.mode === 'submit'`.
4. `getNextFormFieldState` - apply `formatter` (when `format` is true), refresh `props.value` /
   `passiveProps.checked`, set `rawValue` and `displayValue`.
5. Recompute `isDirty`.
6. `processSkippableFields` - clear errors on any field whose `skip(ctx)` returns true.
7. `processScheduledFieldsValidation` - re-validate fields flagged through `scheduleValidation` (used by the
   date-range validators to keep "from" and "to" consistent), then clear the flag.

After the pipeline, `setFieldValue` propagates array values into mounted child forms
(`childForm.setFormValues(value[i])`, asserting lengths match) and, for child forms, asks the parent field to
re-validate via `setTimeout(0)` when the field's error state changed or `alwaysValidateParentField` is set.

`setFormValues(partial, options)` runs the same steps per field but inline in `use-form.ts` (filter,
`resetDependentFields` unless `skipResetDependentFields`, `executeFieldValidator` unless `validate: false`,
`getNextFormFieldState`, then one `processSkippableFields`). Options: `validate`, `updateDirtyValues`
(false leaves dirty fields alone), `dirty`, `clearAll` (reset everything first), `skipOnChange`,
`skipResetDependentFields`. It does not run scheduled validations.

## 5. Validation

### Per-field, synchronous path (`executeFieldValidator`)

1. `normalizeFieldValue` (only `number` has a normalizer).
2. Type validator from `INTERACTIVE_FIELD_TYPE_VALIDATORS_MAP` / `PASSIVE_FIELD_TYPE_VALIDATORS_MAP`
   (`numeric`: `/^\d+$/`; `number`: sign/decimal/maxFraction regex; `email`: RFC-ish regex; others always
   true). Object, nestedForms and polymorphic fields skip this step. A failing type validator stops here.
3. Built-ins: `requiredBuiltInFieldValidator` for all kinds, then for interactive fields
   `min`/`max`/`minMax` value validators (only `type: 'number'`) and length validators (`string`, `email`,
   `numeric`). `min`/`max` may be functions of the execution context.
4. Custom `config.validator(value, ctx)`. `ctx` extends the execution context with `fieldConfig`, `signal`,
   `scheduleValidation`. Return `true`, `false`, a message (string or `ReactElement`), or
   `HoneyFormFieldError[]`. A Promise result marks the field `isValidating`, sets `aria-busy`, and resolves
   later through `field.addErrors` and `finishFieldAsyncValidation`. Each run aborts the previous controller
   for that field.
5. `getNextValidatedField` folds results into `errors`, sets `aria-invalid`, and sets `normalizedValue` only
   when there are no errors.

Error message resolution order: `config.errorMessages.<type>` (value or function of context; `min`/`max`/
`minMax` also receive the constraint value) then the built-in English default.

### Whole form (`validateForm`)

`validateForm({ targetFields, excludeFields, shouldSetErrors })` is async. For every field (sequentially,
via `mapFormFieldsAsync`) it: skips excluded or non-target fields, clears errors on `skip()` fields, awaits
`runChildFormsValidation` (parallel over registered child forms), then awaits `executeFieldValidatorAsync`
which mirrors the sync path but `await`s Promise validators and turns rejections into their message.
`server`-type errors do not make the form invalid. With `shouldSetErrors: false` the result is computed
without touching field state. `onAfterValidate(ctx)` fires after every run. `isFormValid` reflects the
last run and is cleared by any subsequent `setFieldValue`.

### Submit (`submitForm(handler?)`)

Asserts a handler or `onSubmit` exists, sets `isValidating`, runs `validateForm()`, and if valid sets
`isSubmitting`, computes submit values, and awaits `handler(values, { formContext, setFormServerErrors })`.
A returned `HoneyFormServerErrors` map (field -> messages) is converted to `type: 'server'` errors via
`setFormErrors`. Otherwise the form is marked submitted and clean, `resetAfterSubmit` is honored, and the
localStorage entry is removed. `totalFormSubmissions` increments on every valid submission attempt.
`isFormSubmitAllowed` is false while defaults are fetching, any field is async-validating, or the form is
validating/submitting.

## 6. Defaults and external values

`useFormDefaults` handles the `defaults` option:

- Object form: copied into `formDefaultsRef` at init. When `readDefaultsFromStorage` and `name` and
  `storage` are set, stored values are merged over it.
- Function form `({ formContext, signal }) => Promise<Partial<Form>>`: runs in an effect, exposes
  `isFormDefaultsFetching` / `isFormDefaultsFetchingErred`, aborts on unmount, and re-runs when `context`
  changes unless `refetchDefaultsOnContextChange: false`. Resolved values are applied with
  `setFormValues(values, { validate: false, dirty: false, skipOnChange: true, skipResetDependentFields: true })`.

The `values` option is a controlled-ish sync: an effect calls `setFormValues(values, { validate:
validateValues, updateDirtyValues: !skipSyncDirtyFields, dirty: false, skipOnChange: true,
skipResetDependentFields: true })` whenever the reference changes. Callers must memoize `values` and
`context`.

## 7. Nested forms

- Parent declares `items: { type: 'nestedForms', defaultValue: [...] }`. `formFields.items.displayValue` is
  the array the UI maps over; each rendered child gets `formIndex` and `parentField={formFields.items}`.
- `useChildHoneyForm` (or `ChildHoneyForm`) creates a full `useForm` instance whose initial field values come
  from `parentField.displayValue[formIndex]`, then `registerChildForm(parentField, { formId, formFieldsRef,
  submitForm, validateForm, setFormValues })` pushes into `parentField.__meta__.childForms`. Unmount
  unregisters by `formId` (from React `useId`).
- `parentField.getChildFormsValues()` reads live values from every registered child (recursively for nested
  `nestedForms`); before any child mounts it returns `displayValue`. `validateField` and
  `getFormSubmitValues` on the parent use this, so parent-level `validator`s see current child data.
- `pushValue(item)` appends to the parent array without touching mounted children; `removeValue(index)`
  rebuilds the array from `getChildFormsValues()` minus one entry. Children re-key on their own `id`.
- `parentField.setValue(array)` (or `setFormValues` on the parent) propagates into mounted children and
  asserts `array.length === childForms.length`.
- Child forms omit `name`, `storage`, `readDefaultsFromStorage`, and gain `alwaysValidateParentField`.
- `ChildHoneyFormForm` renders `<div role="form" data-testid="child-honey-form">`, not a `<form>`, so it can
  nest inside the parent `<form>`.

## 8. Multi forms

`MultiHoneyForms` provides `MultiHoneyFormsContext`; any `useHoneyForm` mounted below it auto-registers via
`addForm` unless `disableFormsManagement`. `useMultiHoneyForms` exposes `forms`, `isAnyFormSubmitting`,
`addForm`, `insertForm`, `replaceForm`, `removeForm`, `clearForms`, `validateForms`, `submitForms`,
`resetForms`. `submitForms` calls each form's `submitForm` with a collecting handler and invokes the
multi-level `onSubmit(formsData, { formContext })` only when every form validated.

## 9. Storage (`storage: 'qs' | 'ls'`)

- Requires `name`. Only root forms persist (the check is `!parentField`).
- On every change the submit values are serialized by `serializeForm`: per-field `config.serializer`,
  nested objects stringified, then `btoa(encodeURI(JSON))`. `qs` writes `?<name>=<blob>` with
  `history.replaceState` (dev mode warns near browser URL limits); `ls` writes key `honey-form-<name>`.
- Reading (`deserializeForm`) reverses it with per-field `config.deserializer`, ignores unknown keys, and
  returns `undefined` with a warning on corrupt data.
- `readDefaultsFromStorage: true` restores automatically at init. Otherwise, for `ls` only,
  `hasUnsubmittedForm` becomes true when an entry exists and `restoreUnsubmittedForm()` loads it through
  `setFormValues`. The entry is removed on successful submit and on `resetForm`.
- `localStorageCapabilities` from `src/init.ts` guards every `ls` access.

## 10. Components

| Component | Wraps | Render |
| --- | --- | --- |
| `HoneyFormProvider` | `useHoneyForm(props)` into `HoneyFormContext`; children may be a render prop receiving the API. | context only |
| `HoneyFormForm` | `useHoneyFormContext()` | `<form noValidate aria-busy data-testid="honey-form">`, `onSubmit` calls `submitForm().catch(error)` |
| `HoneyForm` | Provider + Form, `formProps` forwarded to the `<form>`, `ref` to the form element. Memoized with `genericMemo`. | |
| `HoneyFormDynamicField` | `addFormField(name, config)` on mount, `removeFormField(name)` on unmount; render prop receives the field. | |
| `ChildHoneyFormProvider` / `ChildHoneyFormForm` / `ChildHoneyForm` / `ChildHoneyFormDynamicField` | Same shape for child forms; the form render prop receives `(childApi, parentApi)`. | `<div role="form" data-testid="child-honey-form">` |
| `MultiHoneyForms` | `useMultiHoneyForms`, context value memoized. | context only |

Context hooks (`useHoneyFormContext`, `useChildHoneyFormContext`, `useMultiHoneyFormsContext`) assert they
are inside their provider.

## 11. Known rough edges

- `FormOptions.mode` is unimplemented (`TODO: IMPLEMENT` in `types.ts`); ESLint flags the unused destructure.
- `getChildFormsValues` carries a `@ts-expect-error` with a TODO because the return type depends on
  `FieldValue` being an array.
- `ChildHoneyFormFormContent` / `ChildHoneyFormContextValue` have TODOs to pass `ParentForm` through the child
  API type.
- `removeFormField` uses `delete` on computed keys (flagged by ESLint, intentional).
- `minMaxLengthBuiltInFieldValidator` passes `{ min: maxLength, max: maxLength }` to the custom `minMax`
  message even when `min !== max`. Looks like a bug; confirm with the maintainer before changing.
- `minMaxValueBuiltInFieldValidator` checks `!isUndefined(minValue) && fieldValue > maxValue` for the upper
  bound (should test `maxValue`). Same caveat.
