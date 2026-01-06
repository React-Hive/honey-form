import React from 'react';
import { assert, isObject, isString, isUndefined, runParallel } from '@react-hive/honey-utils';
import type {
  Nullable,
  JSONValue,
  KeysWithArrayValues,
  HoneyFormId,
  HoneyFormBaseForm,
  HoneyFormFields,
  HoneyFormField,
  HoneyFormChildFormContext,
  HoneyFormParentField,
  HoneyFormFieldsConfig,
  HoneyFormFieldConfig,
  HoneyFormErrors,
  HoneyFormFieldError,
  HoneyFormServerErrors,
  HoneyFormFieldErrorMessage,
  HoneyFormInteractiveFieldConfig,
  HoneyFormPassiveFieldConfig,
  HoneyFormObjectFieldConfig,
  HoneyFormNestedFormsFieldConfig,
  HoneyFormPolymorphicFieldConfig,
  HoneyFormExtractChildForm,
  HoneyFormBaseChildForm,
  HoneyFormBaseExecutionContext,
  HoneyFormStorage,
} from './types';
import { __DEV__, GITHUB_PACKAGE_NAME, HONEY_FORM_ERRORS, HONEY_FORM_LS_PREFIX } from './constants';
import { localStorageCapabilities } from './init';

export const genericMemo: <T>(component: T) => T = React.memo;

export const warning = (message: string) => {
  console.warn(`[${GITHUB_PACKAGE_NAME}]: ${message}`);
};

export const error = (message: string) => {
  console.error(`[${GITHUB_PACKAGE_NAME}]: ${message}`);
};

/**
 * Maps over each field configuration and invokes the provided callback to create form fields.
 *
 * @param fieldsConfig - Object containing field configurations.
 * @param callback - A function invoked for each field configuration, providing the field name and the entire field configuration.
 *
 * @returns Object containing mapped form fields.
 */
export const mapFieldsConfig = <Form extends HoneyFormBaseForm, FormContext>(
  fieldsConfig: HoneyFormFieldsConfig<Form, FormContext>,
  callback: (
    fieldName: keyof Form,
    fieldConfig: HoneyFormFieldConfig<Form, keyof Form, FormContext>,
  ) => HoneyFormField<Form, keyof Form, FormContext>,
): HoneyFormFields<Form, FormContext> =>
  Object.keys(fieldsConfig).reduce(
    (nextFormFields, fieldName: keyof Form) => {
      nextFormFields[fieldName] = callback(fieldName, fieldsConfig[fieldName]);

      return nextFormFields;
    },
    {} as HoneyFormFields<Form, FormContext>,
  );

/**
 * Transforms server-side form errors into a new format using a callback function.
 *
 * @param serverErrors - An object containing server errors for form fields.
 * @param callback - A callback function that processes each field's server errors and returns the transformed error format.
 *
 * @returns A new object where each field's errors are transformed by the callback function.
 */
export const convertServerErrors = <Form extends HoneyFormBaseForm>(
  serverErrors: HoneyFormServerErrors<Form>,
  callback: (
    erredFieldName: keyof Form,
    fieldErrors: HoneyFormFieldErrorMessage[],
  ) => HoneyFormFieldError[],
): HoneyFormErrors<Form> =>
  Object.keys(serverErrors).reduce<HoneyFormErrors<Form>>(
    (nextFormErrors, erredFieldName: keyof Form) => {
      nextFormErrors[erredFieldName] = callback(erredFieldName, serverErrors[erredFieldName]);

      return nextFormErrors;
    },
    {} as never,
  );

/**
 * Iterates over each form field and invokes the provided callback.
 *
 * @param formFields - An object containing the form fields.
 * @param callback - A callback function that is invoked for each form field, providing the field name and the entire form field object.
 */
export const forEachFormField = <Form extends HoneyFormBaseForm, FormContext>(
  formFields: HoneyFormFields<Form, FormContext>,
  callback: (
    fieldName: keyof Form,
    formField: HoneyFormField<Form, keyof Form, FormContext>,
  ) => void,
) => {
  Object.keys(formFields).forEach((fieldName: keyof Form) =>
    callback(fieldName, formFields[fieldName]),
  );
};

/**
 * Processes each field in the provided form fields object using a callback function.
 *
 * @param formFields - An object containing form fields to be processed.
 * @param callback - A function that processes each field.
 *                   It receives the field name and its corresponding field configuration
 *                   and returns the transformed field.
 *
 * @returns A new object where each field has been transformed by the callback function.
 */
export const mapFormFields = <Form extends HoneyFormBaseForm, FormContext>(
  formFields: HoneyFormFields<Form, FormContext>,
  callback: (
    fieldName: keyof Form,
    formField: HoneyFormField<Form, keyof Form, FormContext>,
  ) => HoneyFormField<Form, keyof Form, FormContext>,
): HoneyFormFields<Form, FormContext> => {
  const nextFormFields = {} as HoneyFormFields<Form, FormContext>;

  for (const fieldName of Object.keys(formFields) as (keyof Form)[]) {
    nextFormFields[fieldName] = callback(fieldName, formFields[fieldName]);
  }

  return nextFormFields;
};

/**
 * Asynchronously processes each field in the provided form fields object using a callback function.
 *
 * @param formFields - An object containing form fields to be processed.
 * @param callback - An asynchronous function that processes each field.
 *                   It receives the field name and its corresponding field configuration,
 *                   then returns a Promise resolving to the transformed field.
 *
 * @returns A promise that resolves to a new object where each field has been transformed by the callback function.
 */
export const mapFormFieldsAsync = async <Form extends HoneyFormBaseForm, FormContext>(
  formFields: HoneyFormFields<Form, FormContext>,
  callback: (
    fieldName: keyof Form,
    formField: HoneyFormField<Form, keyof Form, FormContext>,
  ) => Promise<HoneyFormField<Form, keyof Form, FormContext>>,
): Promise<HoneyFormFields<Form, FormContext>> => {
  const nextFormFields = {} as HoneyFormFields<Form, FormContext>;

  for (const fieldName of Object.keys(formFields) as (keyof Form)[]) {
    nextFormFields[fieldName] = await callback(fieldName, formFields[fieldName]);
  }

  return nextFormFields;
};

/**
 * Transforms each field in the given form fields object using a callback function,
 * optionally filtering out specific fields.
 *
 * @template Item - The type of the transformed output for each field.
 *
 * @param formFields - An object containing form fields to be processed.
 * @param callback - A function that receives a field name and its configuration,
 *                   returning a transformed value.
 * @param [filterCallback] - A function that receives a field name and its configuration,
 *                           returning `true` to exclude the field from processing.
 *
 * @returns An object where each field is transformed based on the callback function.
 */
export const iterateFormFields = <Form extends HoneyFormBaseForm, FormContext, Item>(
  formFields: Nullable<HoneyFormFields<Form, FormContext>>,
  callback: (
    fieldName: keyof Form,
    formField: HoneyFormField<Form, keyof Form, FormContext>,
  ) => Item,
  filterCallback?: (
    fieldName: keyof Form,
    formField: HoneyFormField<Form, keyof Form, FormContext>,
  ) => boolean,
): Record<keyof Form, Item> =>
  Object.keys(formFields ?? {}).reduce(
    (nextFormFields, fieldName: keyof Form) => {
      if (filterCallback?.(fieldName, formFields[fieldName]) === false) {
        return nextFormFields;
      }

      nextFormFields[fieldName] = callback(fieldName, formFields[fieldName]);

      return nextFormFields;
    },
    {} as Record<keyof Form, Item>,
  );

/**
 * Iterates over each form field error and invokes the provided callback.
 *
 * @param formErrors - An object containing form field errors.
 * @param callback - A callback function that is invoked for each form field,
 *                   providing the field name and its associated errors.
 */
export const forEachFormError = <Form extends HoneyFormBaseForm>(
  formErrors: HoneyFormErrors<Form>,
  callback: (erredFieldName: keyof Form, fieldErrors: HoneyFormFieldError[]) => void,
) => {
  Object.keys(formErrors).forEach((erredFieldName: keyof Form) =>
    callback(erredFieldName, formErrors[erredFieldName]),
  );
};

/**
 * Get the current values of all form fields.
 *
 * @param formFields - The form fields.
 *
 * @returns The values of all form fields as a form object.
 */
export const getFormValues = <Form extends HoneyFormBaseForm, FormContext>(
  formFields: Nullable<HoneyFormFields<Form, FormContext>>,
): Form => iterateFormFields(formFields, (_, formField) => formField.displayValue) as Form;

/**
 * Checks if the given form field configuration is interactive.
 *
 * @param fieldConfig - The configuration of the form field.
 *
 * @returns A boolean indicating whether the field is interactive.
 */
export const isInteractiveField = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext>,
): fieldConfig is HoneyFormInteractiveFieldConfig<Form, FieldName, FormContext> =>
  fieldConfig.type === 'string' ||
  fieldConfig.type === 'numeric' ||
  fieldConfig.type === 'number' ||
  fieldConfig.type === 'email';

/**
 * Checks if a given form field is of a passive type, such as checkbox, radio, or file.
 *
 * @param fieldConfig - Configuration options for the form field.
 *
 * @returns A boolean indicating whether the field is of a passive type.
 */
export const isPassiveField = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext>,
): fieldConfig is HoneyFormPassiveFieldConfig<Form, FieldName, FormContext> =>
  fieldConfig.type === 'checkbox' || fieldConfig.type === 'radio' || fieldConfig.type === 'file';

/**
 * Checks if a given form field is of an object type.
 *
 * @param fieldConfig - Configuration options for the form field.
 *
 * @returns A boolean indicating whether the field is of an object type.
 */
export const isObjectField = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext>,
): fieldConfig is HoneyFormObjectFieldConfig<Form, FieldName, FormContext> =>
  fieldConfig.type === 'object';

/**
 * Checks if a given form field is nested forms.
 *
 * @param fieldConfig - Configuration options for the form field.
 *
 * @returns A boolean indicating whether the field is nested forms.
 */
export const isNestedFormsField = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext>,
): fieldConfig is HoneyFormNestedFormsFieldConfig<Form, FieldName, FormContext> =>
  fieldConfig.type === 'nestedForms';

export const isPolymorphicField = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext>,
): fieldConfig is HoneyFormPolymorphicFieldConfig<Form, FieldName, FormContext> =>
  fieldConfig.type === 'polymorphic';

/**
 * Options object for determining whether to skip a form field.
 */
type IsSkipFieldOptions<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
> = {
  executionContext: HoneyFormBaseExecutionContext<Form, FormContext>;
  parentField: HoneyFormParentField<ParentForm, ParentFieldName> | undefined;
  /**
   * Name of the field.
   */
  fieldName: FieldName;
};

/**
 * Determines whether a specific form field should be skipped based on the skip function defined in its configuration.
 *
 * @param options - Options object containing form context and form fields.
 *
 * @returns A boolean indicating whether the field should be skipped.
 */
export const isSkipField = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>({
  executionContext,
  fieldName,
  ...options
}: IsSkipFieldOptions<ParentForm, ParentFieldName, Form, FieldName, FormContext>): boolean =>
  executionContext.formFields[fieldName].config.skip?.({
    ...executionContext,
    ...options,
  }) === true;

/**
 * Schedules the validation for a specific form field.
 *
 * @param formField - The form field for which validation is to be scheduled.
 */
export const scheduleFieldValidation = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
>(
  formField: HoneyFormField<Form, FieldName>,
) => {
  formField.__meta__.validationScheduled = true;
};

/**
 * Retrieves the values of the form fields suitable for form submission.
 *
 * @param parentField - The parent form field where the child form is associated.
 * @param formContext - The context associated with the form.
 * @param formFields - The form fields to extract values from.
 *
 * @returns Object containing values of the form fields suitable for submission.
 */
export const getFormSubmitValues = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FormContext,
>(
  parentField: HoneyFormParentField<ParentForm, ParentFieldName> | undefined,
  formContext: FormContext,
  formFields: HoneyFormFields<Form, FormContext>,
): Form => {
  const formValues = getFormValues(formFields);

  return iterateFormFields(
    formFields,
    (_, formField) => {
      if (formField.__meta__.childForms) {
        const childFormsSubmitValues: HoneyFormBaseChildForm[] = [];

        formField.__meta__.childForms.forEach(childForm => {
          const childFormFields = childForm.formFieldsRef.current;
          assert(childFormFields, HONEY_FORM_ERRORS.emptyFormFieldsRef);

          childFormsSubmitValues.push(
            getFormSubmitValues(parentField, formContext, childFormFields),
          );
        });

        return childFormsSubmitValues;
      }

      const isReturnDisplayValue =
        !isInteractiveField(formField.config) || formField.config.submitFormattedValue;

      return isReturnDisplayValue ? formField.displayValue : formField.normalizedValue;
    },
    fieldName =>
      !isSkipField({
        fieldName,
        parentField,
        executionContext: {
          formContext,
          formFields,
          formValues,
        },
      }),
  ) as Form;
};

/**
 * Retrieves form errors for each form field.
 *
 * @param formFields - The form fields to extract errors from.
 *
 * @returns Object containing errors for each form field.
 */
export const getFormErrors = <Form extends HoneyFormBaseForm, FormContext>(
  formFields: HoneyFormFields<Form, FormContext>,
): HoneyFormErrors<Form> =>
  iterateFormFields(
    formFields,
    (_, formField) => formField.errors,
    (_, formField) => formField.errors.length > 0,
  );

/**
 * Registers a child form within a parent form field's metadata.
 *
 * @param parentField - The parent form field where the child form is associated.
 * @param childFormContext - The context information for the child form.
 */
export const registerChildForm = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext,
  ChildForm extends HoneyFormExtractChildForm<ParentForm[ParentFieldName]> =
    HoneyFormExtractChildForm<ParentForm[ParentFieldName]>,
>(
  parentField: HoneyFormParentField<ParentForm, ParentFieldName>,
  childFormContext: HoneyFormChildFormContext<ParentForm, ChildForm, ParentFieldName, FormContext>,
) => {
  // @ts-expect-error
  parentField.__meta__.childForms ||= [];
  // @ts-expect-error
  parentField.__meta__.childForms.push(childFormContext);
};

/**
 * Retrieves the index of a child form within a parent form field's list of child forms.
 *
 * @param parentField - The parent form field containing the child forms.
 * @param formId - The ID of the child form to find.
 *
 * @returns The index of the child form within the parent form field's list of child forms, or -1 if not found.
 */
export const getChildFormIndex = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
>(
  parentField: HoneyFormParentField<ParentForm, ParentFieldName>,
  formId: HoneyFormId,
): number =>
  parentField.__meta__.childForms?.findIndex(childForm => childForm.formId === formId) ?? -1;

/**
 * Unregisters a child form from a parent form field's metadata using the child form's ID.
 *
 * @param parentField - The parent form field from which to unregister the child form.
 * @param formId - The ID of the child form to unregister.
 */
export const unregisterChildForm = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
>(
  parentField: HoneyFormParentField<ParentForm, ParentFieldName>,
  formId: HoneyFormId,
) => {
  const childFormIndex = getChildFormIndex(parentField, formId);

  if (childFormIndex === -1) {
    warning('Child form index cannot be resolved.');
  } else {
    parentField.__meta__.childForms.splice(childFormIndex, 1);
  }
};

/**
 * Runs validation on child forms associated with a given form field.
 *
 * @param formField - The form field containing child forms to validate.
 *
 * @returns A promise resolving to `true` if any child form has validation errors, otherwise `false`.
 */
export const runChildFormsValidation = async <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  formField: HoneyFormField<Form, FieldName, FormContext>,
): Promise<boolean> => {
  const { childForms } = formField.__meta__;
  if (!childForms?.length) {
    // If no child forms are present, there are no errors
    return false;
  }

  let hasErrors = false;

  // Perform validation on child forms (when the field is an array that includes child forms)
  await runParallel(childForms, async childForm => {
    if (!(await childForm.validateForm())) {
      hasErrors = true;
    }
  });

  return hasErrors;
};

export const replaceHistoryState = (searchParams: URLSearchParams) => {
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${searchParams.size > 0 ? `?${searchParams.toString()}` : ''}`,
  );
};

export const checkQueryStringLimit = (searchParams: URLSearchParams) => {
  let queryStringLimit = 0;

  if (navigator.userAgent.includes('Firefox')) {
    queryStringLimit = 65_000;
    //
  } else if (navigator.userAgent.includes('Chrome')) {
    queryStringLimit = 80_000;
    //
  } else if (navigator.userAgent.includes('Opera')) {
    queryStringLimit = 190_000;
  }

  if (queryStringLimit && searchParams.toString().length > queryStringLimit) {
    warning(
      `The query string exceeds the limit of ${queryStringLimit} characters. This might cause unexpected behavior or errors. Please reduce the length of the query string.`,
    );
  }
};

/**
 * Serializes a form object into a base64-encoded string.
 *
 * Each field value is passed through its custom `serializer` (if defined in `fieldsConfig`).
 * Objects are stringified to preserve their structure. The entire form is then encoded as a
 * base64 string for safe transport or storage.
 *
 * @param form - The form object.
 * @param fieldsConfig - Form fields configuration.
 *
 * @returns A base64-encoded string representing the serialized form data.
 */
const serializeForm = <Form extends HoneyFormBaseForm>(
  form: Form,
  fieldsConfig: HoneyFormFieldsConfig<Form>,
): string => {
  const jsonEncodedForm = JSON.stringify(form, (key, value) => {
    // Skip processing for the root object
    if (key === '') {
      return value as Form;
    }

    const processedValue =
      fieldsConfig[key as keyof Form].serializer?.(value as Form[keyof Form]) ??
      (value as JSONValue);

    // Store nested objects as JSON strings
    if (processedValue !== null && isObject(processedValue)) {
      return JSON.stringify(processedValue);
    }

    return processedValue;
  });

  return window.btoa(encodeURI(jsonEncodedForm));
};

/**
 * Deserializes a base64-encoded form string back into a form object.
 *
 * The encoded string is first decoded from base64, then parsed back into an object.
 * Each field value is passed through its custom `deserializer` (if defined in `fieldsConfig`).
 *
 * @param rawFormData - The base64-encoded form string.
 * @param fieldsConfig - Form fields configuration.
 *
 * @returns The reconstructed form object with properly deserialized field values.
 */
const deserializeForm = <Form extends HoneyFormBaseForm>(
  rawFormData: string,
  fieldsConfig: HoneyFormFieldsConfig<Form>,
): Form => {
  const jsonDecodedForm = decodeURI(window.atob(rawFormData));

  return JSON.parse(jsonDecodedForm, (key: keyof Form, value: JSONValue) => {
    // Skip processing for the root object or non-existent key
    if (key === '' || !(key in fieldsConfig)) {
      return value;
    }

    if (isString(value) && (value.startsWith('{') || value.startsWith('['))) {
      value = JSON.parse(value) as JSONValue;
    }

    return fieldsConfig[key].deserializer?.(value) ?? value;
  }) as Form;
};

/**
 * Saves form values into the browser's query string under a specific key (`formName`).
 * The resulting state is stored using  `history.replaceState`, ensuring no page reload occurs.
 *
 * This is useful for:
 * - Persisting form state across navigation
 * - Sharing pre-filled forms via URL
 * - Restoring form state on page refresh
 *
 * @param fieldsConfig - Definitions for each field, including serializer logic.
 * @param formName - The key under which the serialized form will be stored in the query string.
 * @param form - The form values to serialize and persist.
 */
const saveFormToQs = <Form extends HoneyFormBaseForm, FormContext = undefined>(
  fieldsConfig: HoneyFormFieldsConfig<Form, FormContext>,
  formName: string,
  form: Form,
) => {
  const searchParams = new URLSearchParams(window.location.search);
  searchParams.set(formName, serializeForm(form, fieldsConfig));

  if (__DEV__) {
    checkQueryStringLimit(searchParams);
  }

  replaceHistoryState(searchParams);
};

/**
 * Reads a previously saved form from the query string. If the key
 * (`formName`) is not present, the function returns `undefined`.
 *
 * Use this to pre-populate a form from URL parameters.
 *
 * @param fieldsConfig - Field definitions including deserializer logic.
 * @param formName - The key used to locate serialized form data in the query string.
 *
 * @returns The deserialized form object, or undefined if no saved form exists.
 */
const readFormValuesFromQs = <Form extends HoneyFormBaseForm, FormContext = undefined>(
  fieldsConfig: HoneyFormFieldsConfig<Form, FormContext>,
  formName: string,
): Form | undefined => {
  const searchParams = new URLSearchParams(window.location.search);

  const rawFormData = searchParams.get(formName);
  if (!rawFormData) {
    return undefined;
  }

  return deserializeForm(rawFormData, fieldsConfig);
};

const getFormLsKey = (formName: string) => `${HONEY_FORM_LS_PREFIX}${formName}`;

/**
 * Saves form values to the `localStorage`.
 *
 * This is useful when you need durable client-side persistence
 * without exposing form state in the URL.
 *
 * @param fieldsConfig - Field definitions including serializer logic.
 * @param formName - The key under which the serialized form will be stored in localStorage.
 * @param form - The form values to serialize and save.
 */
const saveFormToLs = <Form extends HoneyFormBaseForm, FormContext = undefined>(
  fieldsConfig: HoneyFormFieldsConfig<Form, FormContext>,
  formName: string,
  form: Form,
) => {
  localStorage.setItem(getFormLsKey(formName), serializeForm(form, fieldsConfig));
};

/**
 * Removes all stored data for the specified form from `localStorage`.
 *
 * @param formName - The name of the form whose data should be removed.
 */
export const removeFormFromLs = (formName: string) => {
  localStorage.removeItem(getFormLsKey(formName));
};

/**
 * Checks whether a form has previously been saved to `localStorage`.
 *
 * @param formName - The name of the form to check.
 *
 * @returns `true` if the form exists in `localStorage`, otherwise `false`.
 */
export const isFormSavedToLs = (formName: string) =>
  localStorageCapabilities.readable && localStorage.getItem(getFormLsKey(formName)) !== null;

/**
 * Reads a previously saved form from `localStorage`. If the data is not
 * found or has been cleared, the function returns `undefined`.
 *
 * @param fieldsConfig - Field definitions including deserializer logic.
 * @param formName - The localStorage key prefix identifying the stored form.
 *
 * @returns The deserialized form object, or undefined if no entry exists.
 */
export const readFormValuesFromLs = <Form extends HoneyFormBaseForm, FormContext = undefined>(
  fieldsConfig: HoneyFormFieldsConfig<Form, FormContext>,
  formName: string,
): Form | undefined => {
  if (isUndefined(localStorage)) {
    return undefined;
  }

  const rawFormData = localStorage.getItem(getFormLsKey(formName));
  if (!rawFormData) {
    return undefined;
  }

  return deserializeForm(rawFormData, fieldsConfig);
};

/**
 * Saves form data to either the query string (`qs`) or localStorage (`ls`)
 * depending on the configured storage mode.
 *
 * @param storage - The storage provider.
 * @param fieldsConfig - Field definitions with serialization logic.
 * @param formName - The key used to store/restore the serialized form.
 * @param values - The form values to serialize and persist.
 */
export const saveFormToStorage = <Form extends HoneyFormBaseForm, FormContext = undefined>(
  storage: HoneyFormStorage,
  fieldsConfig: HoneyFormFieldsConfig<Form, FormContext>,
  formName: string,
  values: Form,
) => {
  if (storage === 'qs') {
    saveFormToQs(fieldsConfig, formName, values);
    //
  } else if (storage === 'ls') {
    saveFormToLs(fieldsConfig, formName, values);
  }
};

/**
 * Reads a previously saved form from the specified storage provider.
 *
 * @param storage - The storage provider.
 * @param fieldsConfig - Field definitions containing deserializer logic.
 * @param formName - The unique key under which the form was previously stored.
 *
 * @returns The restored form object, or `undefined` if no matching entry exists.
 */
export const readFormFromStorage = <Form extends HoneyFormBaseForm, FormContext = undefined>(
  storage: HoneyFormStorage,
  fieldsConfig: HoneyFormFieldsConfig<Form, FormContext>,
  formName: string,
): Form | undefined => {
  if (storage === 'qs') {
    return readFormValuesFromQs(fieldsConfig, formName);
    //
  } else if (storage === 'ls') {
    if (localStorageCapabilities.readable) {
      return readFormValuesFromLs(fieldsConfig, formName);
    } else {
      warning('Local storage is not available.');
    }
  }
};
