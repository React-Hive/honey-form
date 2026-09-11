# React Honey Form

[![Latest version](https://img.shields.io/npm/v/@react-hive/honey-form)](https://www.npmjs.com/package/@react-hive/honey-form)
[![Publish status](https://github.com/React-Hive/honey-form/actions/workflows/publish.yml/badge.svg)](https://github.com/React-Hive/honey-form/actions/workflows/publish.yml)
[![Package size](https://img.shields.io/bundlephobia/minzip/@react-hive/honey-form)](https://www.npmjs.com/package/@react-hive/honey-form)
[![Downloads statistic](https://img.shields.io/npm/dm/@react-hive/honey-form)](https://www.npmjs.com/package/@react-hive/honey-form)
[![Commit activity](https://img.shields.io/github/commit-activity/m/React-Hive/honey-form)](https://www.npmjs.com/package/@react-hive/honey-form)
[![Licence](https://img.shields.io/npm/l/@react-hive/honey-form)](https://www.npmjs.com/package/@react-hive/honey-form)

<p align="center">
  <img width="200" src="HoneyFormLogo.png" alt="Logo">
</p>

## Intro

**Honey Form** is a React library designed to simplify the process of creating and managing forms. It offers a collection of customizable and extensible hooks and components that enable you to effortlessly create forms that seamlessly integrate with your application's visual style.

With Honey Form, you can streamline your form development workflow and handle form state management with ease. The library provides an intuitive API and a range of features to support various form scenarios, including dynamic form fields, nested forms, synchronous and asynchronous validation, error handling, form persistence, and form submission.

## Key Features

1. **Customizable and Extensible**: Honey Form gives you plain props to spread onto your own inputs. You have full control over the markup, styling, and behavior of every element.
2. **Effortless Form Creation**: Define your form structure with a typed configuration object, set validation rules, and handle form submission with simplicity.
3. **Dynamic and Nested Forms**: Add or remove fields at runtime, and compose repeatable child forms (line items, addresses, contacts) that stay in sync with the parent form.
4. **Form Validation**: Built-in validators for common field types, custom synchronous or Promise-based validators with cancellation, dependent fields, and configurable validation timing (`change`, `blur`, `submit`).
5. **Form Submission**: Hook into the submission event, work with clean, type-normalized values, and map server-side validation errors back onto fields.
6. **Persistence**: Optionally keep unsubmitted form values in the query string or `localStorage`, and let users restore what they typed.

## Installation

```bash
pnpm add @react-hive/honey-form
```

`react` and `react-dom` 19 are peer dependencies.

## Examples

*Hook based example*

```typescript jsx
import React from 'react';
import { useHoneyForm } from '@react-hive/honey-form';

// Define the form fields structure
type ProfileForm = {
  name: string;
  age: number;
};

const Form = () => {
  // Use the useHoneyForm hook to manage form state
  const { formFields, submitForm } = useHoneyForm<ProfileForm>({
    fields: {
      name: {
        type: 'string',
        required: true,
      },
      age: {
        type: 'number',
      },
    },
    onSubmit: async data => {
      // Handle form submission
      console.log(data);
    },
  });

  return (
    <form noValidate>
      <input {...formFields.name.props} />
      {formFields.name.errors.map(error => (
        <span key={error.type}>{error.message}</span>
      ))}

      <input {...formFields.age.props} />

      <button type="button" onClick={() => submitForm()}>
        Submit
      </button>
    </form>
  );
};
```

*Component based example*

```typescript jsx
import React from 'react';
import { HoneyForm } from '@react-hive/honey-form';

// Define the form fields structure
type ProfileForm = {
  name: string;
  age: number;
};

const Form = () => {
  const handleSubmit = async (data: ProfileForm) => {
    // Process form data
    console.log(data);
  };

  // The component renders a <form noValidate> element and submits on the native submit event
  return (
    <HoneyForm
      fields={{
        name: {
          type: 'string',
          required: true,
        },
        age: {
          type: 'number',
        },
      }}
      onSubmit={handleSubmit}
    >
      {/* The render prop receives the same API object the hook returns */}
      {({ formFields, isFormSubmitAllowed }) => (
        <>
          <input {...formFields.name.props} />
          <input {...formFields.age.props} />

          <button type="submit" disabled={!isFormSubmitAllowed}>
            Submit
          </button>
        </>
      )}
    </HoneyForm>
  );
};
```

`HoneyForm` is a thin composition of `HoneyFormProvider` (runs the hook and provides context) and `HoneyFormForm` (renders the `<form>`). Use them separately when you need the form API in deeply nested components via `useHoneyFormContext()`.

## Form Options

The `useHoneyForm` hook (and the `HoneyForm` component) takes an options object with the following properties:

1. `fields` - An object that defines the fields of the form. Each key is a field name and each value is a field configuration. See [Field Configuration](#field-configuration).
2. `name` - The form name. Required when `storage` is used. It is the key under which the form values are persisted.
3. `defaults` - Default values for the form fields. Has priority over the `defaultValue` specified in the field configuration. Either a plain object (values may be lazy functions `() => value`) or an async resolver `({ formContext, signal }) => Promise<Partial<Form>>`. While an async resolver is running, `isFormDefaultsFetching` is `true`; the `signal` is aborted when the form unmounts or defaults are refetched.
4. `readDefaultsFromStorage` - When `true`, the form reads previously persisted values from the configured `storage` on initialization and uses them as defaults. Default is `false`.
5. `refetchDefaultsOnContextChange` - Re-run the async `defaults` resolver whenever `context` changes. Default is `true`.
6. `values` - External values to keep the form in sync with. Whenever the reference changes, the values are written into the form without marking it dirty and without triggering `onChange`. Memoize this object.
7. `validateValues` - Whether synced `values` are validated. Default is `true`.
8. `skipSyncDirtyFields` - When `true`, fields the user already modified are not overwritten by `values`. Default is `false`.
9. `resetAfterSubmit` - Reset the form to its initial state after a successful submission (when `onSubmit` returns no server errors). Default is `false`.
10. `storage` - Where to persist form values on every change: `'qs'` (query string) or `'ls'` (`localStorage`). See [Persisting Form State](#persisting-form-state).
11. `context` - Any object passed to validators, filters, formatters, `skip`, `required`, `min`/`max` functions, and callbacks as `formContext`. Memoize it.
12. `onAfterValidate` - An async callback invoked after every form validation with `{ formFields, formValues, formContext, formErrors, isFormErred }`. Wrap it in `useCallback`.
13. `onSubmit` - `async (data, { formContext, setFormServerErrors }) => serverErrors | void`. Called with the submit values after validation passes. Return an object like `{ email: ['Already taken'] }` (or call `setFormServerErrors`) to attach server errors to fields.
14. `onChange` - `(submitValues, { formFields, formValues, formContext, formErrors, parentField }) => void`. Called when any field value changes.
15. `onChangeDebounce` - Debounce time in milliseconds for the `onChange` callback. A field-level `onChangeDebounce` takes precedence for changes initiated by that field.

## Field Configuration

All field types share these options:

1. `type` - The field type. Determines which props are generated and which built-in validation applies:
   - `string`: A general text input.
   - `numeric`: Digits only. The value stays a string (for phone numbers, zip codes, card numbers).
   - `number`: A number, optionally with decimals and a negative sign (see `decimal`, `negative`, `maxFraction`). The submit value is normalized to a JavaScript `number`.
   - `email`: An email input with format validation.
   - `checkbox`: A checkbox input. Its value is a boolean and `passiveProps` include `checked`.
   - `radio`: A radio input. Set the `value` attribute on the input yourself; `passiveProps` provide `name`, `onChange`, and ARIA attributes.
   - `file`: A file input. Its value is the `FileList` from the change event.
   - `object`: Any value that is not typed by the user (dates, select options, arrays). Set it with `field.setValue(value)`.
   - `nestedForms`: An array of child forms. See [Nested Forms](#nested-forms).
   - `polymorphic`: A value whose shape varies. No built-in type validation; only `required` and your custom `validator` run.

   The `string`, `numeric`, `number`, and `email` types are *interactive* and expose `field.props`. The `checkbox`, `radio`, and `file` types are *passive* and expose `field.passiveProps`. The remaining types expose neither.
2. `required` - Whether the field must have a value. A boolean, a string (used as the error message), or a function `(executionContext) => boolean | string` for conditional requirements. For `checkbox` fields, `false` counts as empty. Default is `false`.
3. `defaultValue` - The default value, or a lazy function `() => value` that is called when the field is initialized or reset. Form-level `defaults` override it.
4. `dependsOn` - One or more fields this field depends on. When any of them changes, this field is reset. A field name, an array of field names, or a function `(initiatorFieldName, value, executionContext) => boolean`.
5. `resetOnDependencyToDefault` - When a dependency changes, restore this field to its `defaultValue` instead of clearing it to `undefined`. Default is `false`.
6. `errorMessages` - Custom messages per error type: `required`, `invalid`, `server`, `min`, `max`, `minMax`. Each is a string, a React element, or a function receiving the execution context (`min`/`max` also receive the constraint value, `minMax` receives `{ min, max }`).
7. `props` - Extra attributes merged into the generated input props (placeholder, autoComplete, className, ...). They are spread last and can override generated ones.
8. `skip` - `(executionContext) => boolean`. When it returns `true`, the field is not validated and is excluded from the submit values.
9. `serializer` / `deserializer` - Convert the value to and from JSON when the form is persisted with `storage`.
10. `onChange` - `(normalizedValue, executionContext) => void`. Called whenever this field's value changes.
11. `onChangeDebounce` - Debounce time in milliseconds for this field's `onChange` (and for the form-level `onChange` when the change originates from this field).

Options for interactive fields (`string`, `numeric`, `number`, `email`):

12. `mode` - When validation runs for this field: `'change'` (every keystroke), `'blur'` (when the input loses focus), or `'submit'` (only on form validation/submission). Default is `'change'`. Passive, object, nested-forms, and polymorphic fields also accept `mode`, except `'blur'`.
13. `min` / `max` - For `number` fields, the minimum/maximum value. For `string`, `email`, and `numeric` fields, the minimum/maximum length. A number or a function `(executionContext) => number | undefined`.
14. `decimal` - Allow decimal values for `number` fields. Default is `false`.
15. `negative` - Allow negative values for `number` fields. Default is `true`.
16. `maxFraction` - Maximum number of decimal places for `number` fields when `decimal` is `true`. Default is `2`.
17. `trimStart` - Remove leading whitespace while typing. Default is `true`.
18. `validator` - Custom validation. See [Validation](#validation).
19. `filter` - `(value, executionContext) => value`. Removes or rewrites characters before the value is stored and validated. See [Built-in Filters, Formatters, and Validators](#built-in-filters-formatters-and-validators).
20. `formatter` - `(value, executionContext) => value`. Transforms the stored value into the value displayed in the input.
21. `formatOnBlur` - Apply the formatter only when the input loses focus instead of on every keystroke. Default is `false`.
22. `submitFormattedValue` - Submit the formatted (display) value instead of the normalized value. Default is `false`.

Options for `object` fields:

23. `allowEmptyArray` - When the value is an array, treat an empty array as a valid value for `required`. Default is `false`.
24. `allowEmptyArrayValues` - When the value is an array, allow `null`, `undefined`, or empty-string items for `required`. Default is `false`.

## Validation

A custom `validator` receives the current value and a context object:

```typescript jsx
validator: (value, { formValues, formContext, fieldConfig, signal, scheduleValidation }) => {
  if (value === 'admin') {
    return 'This name is reserved';
  }

  return true;
};
```

It can return:

- `true` when the value is valid.
- `false` to add the `invalid` error with the default or configured message.
- A string or React element used as the `invalid` error message.
- An array of `{ type, message }` errors.
- A `Promise` resolving to any of the above. While it is pending, `field.isValidating` is `true` and `field.props['aria-busy']` is set. Starting a new validation aborts the previous one through `signal`, so pass it to `fetch` or axios. Other rejections become `invalid` errors with the rejection message.

`scheduleValidation(otherFieldName)` re-validates another field right after this one, which is how the built-in date range validators keep "from" and "to" fields consistent.

Built-in validation runs first: the type check (for example the email format), then `required`, then `min`/`max`. The custom validator runs only when those pass.

### Dependent fields

```typescript jsx
fields: {
  country: { type: 'object' },
  city: { type: 'object', dependsOn: 'country' },
  street: { type: 'string', dependsOn: ['country', 'city'] },
}
```

Changing `country` clears `city` and `street`; changing `city` clears `street`. Use `resetOnDependencyToDefault: true` to restore the default value instead of clearing.

### Server errors

```typescript jsx
onSubmit: async data => {
  const response = await api.saveProfile(data);

  if (response.status === 422) {
    // Keys are field names, values are error messages
    return response.errors;
  }
};
```

Server errors get the type `server`. They are shown like any other error but do not block the next submission, and they are cleared as soon as the field changes.

## Field Object

Every entry in `formFields` has the following properties:

1. `config` - The resolved configuration of the field, including defaults.
2. `defaultValue` - The default value the field was initialized with.
3. `rawValue` - The value after `trimStart` and `filter`, before `formatter`.
4. `displayValue` - The value after `formatter`. This is what `props.value` shows and what `formValues` contains.
5. `normalizedValue` - The type-normalized value (`number` fields become numbers). It is `undefined` while the field has errors. This is what `formSubmitValues` and `onSubmit` receive for interactive fields.
6. `errors` - An array of `{ type, message }` objects. Types: `required`, `invalid`, `min`, `max`, `minMax`, `server`.
7. `isDirty` - Whether the value differs from the initial value.
8. `isValidating` - Whether a Promise-based validator is currently running.
9. `props` - Props for interactive fields: `ref`, `name`, `value`, `onChange`, `onBlur` (for `mode: 'blur'` or `formatOnBlur`), `inputMode`, `type` (for `email`), `aria-required`, `aria-invalid`, `aria-busy`. Spread onto an `<input>` or `<textarea>`.
10. `passiveProps` - Props for `checkbox`, `radio`, and `file` fields: `ref`, `name`, `type`, `onChange`, `checked` (checkbox), and ARIA attributes.
11. `ref` - The ref attached through `props`/`passiveProps`.
12. `setValue(value, { validate, dirty, format })` - Set the value programmatically. All options default to `true`.
13. `pushValue(value)` - Append an item to a `nestedForms` field.
14. `removeValue(index)` - Remove an item from a `nestedForms` field by index.
15. `resetValue()` - Reset the field to its default value and clear its errors.
16. `addError(error)` / `addErrors(errors)` - Add errors manually.
17. `clearErrors()` - Remove all errors from the field.
18. `validate()` - Validate the field now.
19. `focus()` - Focus the bound input. Requires `props` or `passiveProps` to be spread onto an element.
20. `getChildFormsValues()` - For a `nestedForms` field, the current values of the mounted child forms.
21. `__meta__` - Internal metadata used by the library.

## Form API

The `useHoneyForm` hook returns (and the `HoneyForm` render prop receives) an object with the following properties:

1. `formId` - A unique ID of the form instance.
2. `formContext` - The `context` option as passed in.
3. `formFields` - The field objects described above.
4. `formValues` - The display values of all fields.
5. `formSubmitValues` - The values that would be submitted right now: normalized values, without skipped fields, with child forms resolved.
6. `formDefaultValues` - The resolved default values of all fields.
7. `formErrors` - An object with a field's errors under its name. Fields without errors are absent, so it is `{}` for a valid form.
8. `totalFormSubmissions` - How many times the form has been submitted successfully.
9. `isFormErred` - `true` when any field has an error.
10. `isFormDefaultsFetching` - `true` while the async `defaults` resolver is running.
11. `isFormDefaultsFetchingErred` - `true` when the async `defaults` resolver failed.
12. `isFormDirty` - `true` after any field changed. Becomes `false` after a successful submission or a reset.
13. `isFormValidating` - `true` while `validateForm` or the validation step of `submitForm` is running.
14. `isFormValid` - `true` when the last validation found no errors. Cleared when any field changes.
15. `isFormSubmitting` - `true` while `onSubmit` is running.
16. `isFormSubmitted` - `true` after a successful submission. Cleared when any field changes.
17. `isAnyFormFieldValidating` - `true` while any field runs a Promise-based validator.
18. `isFormSubmitAllowed` - `false` while defaults are fetching, any field is validating, or the form is validating or submitting. Bind it to the submit button's `disabled`.
19. `hasUnsubmittedForm` - `true` when a previously saved, unsubmitted version of the form exists in `localStorage`. See [Persisting Form State](#persisting-form-state).
20. `setFormValues(values, { validate, updateDirtyValues, dirty, clearAll, skipOnChange, skipResetDependentFields })` - Set several field values at once. Supports partial updates. `clearAll` resets the fields that are not mentioned.
21. `setFormErrors(errors)` - Replace the errors of the given fields.
22. `addFormField(name, config)` / `removeFormField(name)` - Add or remove a field at runtime. See [Dynamic Fields](#dynamic-fields).
23. `addFormFieldError(name, error)` / `addFormFieldErrors(name, errors)` - Add errors to a field while keeping the existing ones.
24. `clearFormErrors()` - Clear the errors of all fields.
25. `validateForm({ targetFields, excludeFields, shouldSetErrors })` - Validate the whole form (or a subset). Resolves to `true` when valid. Pass `shouldSetErrors: false` for a silent check that does not touch the displayed errors.
26. `submitForm(handler?)` - Validate and submit. Uses `onSubmit` unless a handler is passed. Resolves after the handler completes.
27. `resetForm(newDefaults?)` - Reset all fields to their defaults (optionally replacing some defaults first) and clear errors.
28. `restoreUnsubmittedForm()` - Load the values saved in `localStorage` into the form. Only available when `hasUnsubmittedForm` is `true`.

## Persisting Form State

Set `name` and `storage` to save the submit values on every change:

```typescript jsx
type SettingsForm = {
  name: string;
  birthday: Date;
};

const { formFields, hasUnsubmittedForm, restoreUnsubmittedForm } = useHoneyForm<SettingsForm>({
  name: 'profile',
  storage: 'ls', // or 'qs' to keep the state in the URL
  fields: {
    name: { type: 'string' },
    birthday: {
      type: 'object',
      // Dates are stored as ISO strings; turn them back into Date instances when restoring
      deserializer: raw => new Date(raw as string),
    },
  },
});

return (
  <>
    {hasUnsubmittedForm && (
      <button type="button" onClick={restoreUnsubmittedForm}>
        Restore unsaved changes
      </button>
    )}
    <input {...formFields.name.props} />
  </>
);
```

- `storage: 'ls'` writes to `localStorage` under `honey-form-<name>`. The entry is removed after a successful submission or a reset. When an entry exists on mount, `hasUnsubmittedForm` becomes `true` so you can offer `restoreUnsubmittedForm()`.
- `storage: 'qs'` writes a `<name>` parameter into the query string with `history.replaceState`, which lets users share or bookmark a pre-filled form.
- `readDefaultsFromStorage: true` restores the saved values automatically as form defaults instead of asking.
- Use `serializer` / `deserializer` on a field for values that are not plain JSON.

Child forms cannot persist on their own; the root form stores the whole tree.

## Nested Forms

A `nestedForms` field holds an array. Each item is edited by a child form that is bound to the parent field and its index:

```typescript jsx
import {
  HoneyForm,
  ChildHoneyForm,
  useHoneyFormContext,
  type ChildHoneyFormFieldsConfig,
} from '@react-hive/honey-form';

type Item = {
  id: string;
  name: string;
  price: number;
};

type OrderForm = {
  items: Item[];
};

const itemFields: ChildHoneyFormFieldsConfig<OrderForm, 'items'> = {
  id: { type: 'string', required: true },
  name: { type: 'string', required: true },
  price: { type: 'number', required: true, defaultValue: 0 },
};

const ItemForm = ({ formIndex }: { formIndex: number }) => {
  const { formFields: orderFields } = useHoneyFormContext<OrderForm>();

  return (
    <ChildHoneyForm formIndex={formIndex} parentField={orderFields.items} fields={itemFields}>
      {({ formFields }) => (
        <>
          <input {...formFields.name.props} />
          <input {...formFields.price.props} />

          <button type="button" onClick={() => orderFields.items.removeValue(formIndex)}>
            Remove
          </button>
        </>
      )}
    </ChildHoneyForm>
  );
};

const Order = () => (
  <HoneyForm<OrderForm>
    fields={{ items: { type: 'nestedForms', defaultValue: [] } }}
    onSubmit={async data => console.log(data.items)}
  >
    {({ formFields }) => (
      <>
        {formFields.items.displayValue?.map((item, index) => (
          <ItemForm key={item.id} formIndex={index} />
        ))}

        <button
          type="button"
          onClick={() => formFields.items.pushValue({ id: crypto.randomUUID(), name: '', price: 0 })}
        >
          Add item
        </button>

        <button type="submit">Submit</button>
      </>
    )}
  </HoneyForm>
);
```

- `ChildHoneyForm` (or the `useChildHoneyForm` hook) accepts the same options as a root form except `name`, `storage`, and `readDefaultsFromStorage`, plus `parentField`, `formIndex`, and `alwaysValidateParentField`.
- Submitting the parent validates every mounted child form first. Submit values contain the child forms' values as an array.
- `parentField.setValue(array)` and `setFormValues` on the parent push values down into the mounted child forms.
- `ChildHoneyForm` renders a `<div role="form">`, so it can live inside the parent `<form>`. The render prop receives `(childFormApi, parentFormApi)`.
- A parent-level `validator` on the `nestedForms` field receives the current child values, for example to require at least one item.

## Dynamic Fields

Fields can be added and removed while the form is mounted, either with `addFormField` / `removeFormField` or declaratively:

```typescript jsx
type Form = {
  name: string;
  phone?: string;
};

<HoneyForm<Form> fields={{ name: { type: 'string' } }}>
  {({ formFields }) => (
    <>
      <input {...formFields.name.props} />

      {showPhone && (
        <HoneyFormDynamicField name="phone" type="string" required>
          {field => <input {...field.props} />}
        </HoneyFormDynamicField>
      )}
    </>
  )}
</HoneyForm>
```

The field is registered when the component mounts and removed when it unmounts. `ChildHoneyFormDynamicField` does the same inside a child form.

## Multiple Forms

`MultiHoneyForms` collects every form rendered below it so they can be validated and submitted together:

```typescript jsx
<MultiHoneyForms<ProfileForm> onSubmit={async profiles => api.saveAll(profiles)}>
  {({ submitForms, isAnyFormSubmitting }) => (
    <>
      <HoneyForm fields={profileFields} />
      <HoneyForm fields={profileFields} />

      <button type="button" onClick={submitForms} disabled={isAnyFormSubmitting}>
        Save all
      </button>
    </>
  )}
</MultiHoneyForms>
```

The `onSubmit` callback receives an array with every form's data and is called only when all forms are valid. The API (`forms`, `addForm`, `removeForm`, `insertForm`, `replaceForm`, `clearForms`, `validateForms`, `submitForms`, `resetForms`) is also available through `useMultiHoneyForms` and `useMultiHoneyFormsContext`.

## Built-in Filters, Formatters, and Validators

Filters (use as `filter`):

- `createHoneyFormNumericFilter({ maxLength, allowLeadingZeros })` - Keep digits only, optionally limit the length and strip leading zeros.
- `createHoneyFormNumberFilter({ decimal, negative, splitThousands, maxLengthBeforeDecimal, maxLengthAfterDecimal })` - Keep a valid number while typing, optionally inserting thousands separators.

Formatters (use as `formatter`):

- `createHoneyFormSplitStringFormatter(segmentLength, delimiter = ' ')` - Group characters, for example `1234 5678 9012`.
- `createHoneyFormNumberFormatter({ decimal, maxLengthAfterDecimal })` - Pad decimals, for example `12` becomes `12.00`.

Validators (use as `validator` on `object` fields holding `Date` values):

- `createHoneyFormDateFromValidator({ dateToKey, minDate, maxDate, errorMsg, ignoreTime, inclusiveRange })`
- `createHoneyFormDateToValidator({ dateFromKey, minDate, maxDate, errorMsg, ignoreTime, inclusiveRange })`

Both keep a date range consistent by re-validating the paired field whenever one of them changes. Call them inline in the field configuration so the form type is inferred, and describe the form with the `CustomDateRangeForm` helper type:

```typescript jsx
import {
  useHoneyForm,
  createHoneyFormDateFromValidator,
  createHoneyFormDateToValidator,
  type CustomDateRangeForm,
} from '@react-hive/honey-form';

type DateRangeForm = CustomDateRangeForm<'fromDate', 'toDate'>;

const { formFields } = useHoneyForm<DateRangeForm>({
  fields: {
    fromDate: {
      type: 'object',
      validator: createHoneyFormDateFromValidator({
        dateToKey: 'toDate',
        minDate: new Date('2024-01-01'),
      }),
    },
    toDate: {
      type: 'object',
      validator: createHoneyFormDateToValidator({
        dateFromKey: 'fromDate',
      }),
    },
  },
});

// Bind to any date picker
<DatePicker value={formFields.fromDate.displayValue} onChange={formFields.fromDate.setValue} />;
```

## Conclusion

`@react-hive/honey-form` is a powerful and customizable library for creating and managing forms in React. With its hooks and components you can build forms that blend with your application's design while getting typed values, flexible validation, nested and dynamic fields, persistence, and straightforward submission handling. Whether you're building simple or complex forms, it helps you create delightful user experiences with ease.
