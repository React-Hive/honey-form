import React from 'react';
import type {
  Nullable,
  JSONValue,
  KeysWithArrayValues,
  HoneyFormBaseFieldsConfig,
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
  HoneyFormFieldSerializer,
  HoneyFormFieldDeserializer,
  HoneyFormInteractiveFieldConfig,
  HoneyFormPassiveFieldConfig,
  HoneyFormObjectFieldConfig,
  HoneyFormNestedFormsFieldConfig,
  HoneyFormExtractChildForm,
  HoneyFormBaseChildForm,
  HoneyFormBaseExecutionContext,
} from './types';
import { HONEY_FORM_ERRORS } from './constants';

export const noop = () => {
  //
};

export const genericMemo: <T>(component: T) => T = React.memo;

export const isString = (value: unknown): value is string => typeof value === 'string';

export const isNumber = (value: unknown): value is number => typeof value === 'number';

export const isFunction = (value: unknown) => typeof value === 'function';

export const isPromise = <T = unknown>(value: unknown): value is Promise<T> =>
  isFunction((value as Promise<T>)?.then);

/**
 * Checks if a value is null or undefined.
 *
 * @param value - The value to check.
 *
 * @returns `true` if the value is `null` or `undefined`, otherwise `false`.
 */
export const isNil = (value: unknown): value is null | undefined =>
  value === undefined || value === null;

export const warningMessage = (message: string) => {
  console.warn(`[honey-form]: ${message}`);
};

export const errorMessage = (message: string) => {
  console.error(`[honey-form]: ${message}`);
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
  Object.keys(serverErrors).reduce((nextFormErrors, erredFieldName: keyof Form) => {
    nextFormErrors[erredFieldName] = callback(erredFieldName, serverErrors[erredFieldName]);

    return nextFormErrors;
  }, {} as HoneyFormErrors<Form>);

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
): Form => iterateFormFields(formFields, (_, formField) => formField.value) as Form;

/**
 * Checks if the given form field configuration is interactive.
 *
 * @param fieldConfig - The configuration of the form field.
 *
 * @returns A boolean indicating whether the field is interactive.
 */
export const checkIfHoneyFormFieldIsInteractive = <
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
 * Checks if a given form field is of passive type, such as checkbox, radio, or file.
 *
 * @param fieldConfig - Configuration options for the form field.
 *
 * @returns A boolean indicating whether the field is of passive type.
 */
export const checkIfFieldIsPassive = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext>,
): fieldConfig is HoneyFormPassiveFieldConfig<Form, FieldName, FormContext> =>
  fieldConfig.type === 'checkbox' || fieldConfig.type === 'radio' || fieldConfig.type === 'file';

/**
 * Checks if a given form field is of object type.
 *
 * @param fieldConfig - Configuration options for the form field.
 *
 * @returns A boolean indicating whether the field is of object type.
 */
export const checkIfFieldIsObject = <
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
export const checkIfFieldIsNestedForms = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext>,
): fieldConfig is HoneyFormNestedFormsFieldConfig<Form, FieldName, FormContext> =>
  fieldConfig.type === 'nestedForms';

/**
 * Options object for determining whether to skip a form field.
 */
type CheckIsSkipFieldOptions<
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
export const checkIsSkipFormField = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>({
  executionContext,
  fieldName,
  ...options
}: CheckIsSkipFieldOptions<ParentForm, ParentFieldName, Form, FieldName, FormContext>): boolean =>
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
  formField.__meta__.isValidationScheduled = true;
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
export const getSubmitFormValues = <
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
        const childFormsCleanValues: HoneyFormBaseChildForm[] = [];

        formField.__meta__.childForms.forEach(childForm => {
          const childFormFields = childForm.formFieldsRef.current;
          if (!childFormFields) {
            throw new Error(HONEY_FORM_ERRORS.emptyFormFieldsRef);
          }

          childFormsCleanValues.push(
            getSubmitFormValues(parentField, formContext, childFormFields),
          );
        });

        return childFormsCleanValues;
      }

      return !checkIfHoneyFormFieldIsInteractive(formField.config) ||
        formField.config.submitFormattedValue
        ? formField.value
        : formField.cleanValue;
    },
    fieldName =>
      !checkIsSkipFormField({
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
  ChildForm extends HoneyFormExtractChildForm<
    ParentForm[ParentFieldName]
  > = HoneyFormExtractChildForm<ParentForm[ParentFieldName]>,
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
    warningMessage('Child form index cannot be resolved.');
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
  await Promise.all(
    childForms.map(async childForm => {
      if (!(await childForm.validateForm())) {
        hasErrors = true;
      }
    }),
  );

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
    warningMessage(
      `The query string exceeds the limit of ${queryStringLimit} characters. This might cause unexpected behavior or errors. Please reduce the length of the query string.`,
    );
  }
};

/**
 * Serializes a form object into a base64-encoded string.
 *
 * This function processes the form data by applying a custom serializer to each field, and then
 * encodes the result in base64.
 *
 * @param formData - The form data to be serialized.
 * @param formFieldSerializer - The serializer function applied to each field.
 *
 * @returns A base64-encoded string representing the serialized form data.
 */
const serializeForm = <Form extends HoneyFormBaseForm>(
  formData: Form,
  formFieldSerializer: HoneyFormFieldSerializer<Form>,
): string => {
  const jsonEncodedForm = JSON.stringify(formData, (key, value) => {
    // Handle the special case of the initial object to avoid unnecessary processing
    if (key === '') {
      return value as Form;
    }

    const processedValue = formFieldSerializer(key as keyof Form, value as Form[keyof Form]);

    if (processedValue !== null && typeof processedValue === 'object') {
      return JSON.stringify(processedValue);
    }

    return processedValue;
  });

  return window.btoa(encodeURI(jsonEncodedForm));
};

/**
 * Deserializes raw form data into a form object.
 *
 * @param rawFormData - The raw form data as a string.
 * @param formFieldDeserializer - The deserializer function for the form fields.
 *
 * @returns The deserialized form object.
 */
const deserializeForm = <Form extends HoneyFormBaseForm>(
  rawFormData: string,
  formFieldDeserializer: HoneyFormFieldDeserializer<Form>,
): Form =>
  JSON.parse(decodeURI(window.atob(rawFormData)), (key: keyof Form, value: JSONValue) => {
    // Handle the special case of the initial object to avoid unnecessary processing
    if (key === '') {
      return value;
    }

    if (isString(value) && (value[0] === '{' || value[0] === '[')) {
      value = JSON.parse(value) as JSONValue;
    }

    return formFieldDeserializer(key, value);
  }) as Form;

/**
 * Serializes form data and stores it in the query string under the specified form name.
 *
 * @param fieldsConfig - Configuration object for the form fields, including serializer functions.
 * @param formName - The name to use as the key in the query string.
 * @param formData - The form data to serialize and store in the query string.
 */
export const serializeFormToQueryString = <Form extends HoneyFormBaseForm, FormContext = undefined>(
  fieldsConfig: HoneyFormBaseFieldsConfig<Form, FormContext>,
  formName: string,
  formData: Form,
) => {
  const searchParams = new URLSearchParams(window.location.search);

  searchParams.set(
    formName,
    serializeForm(
      formData,
      (fieldName, fieldValue) =>
        fieldsConfig[fieldName].serializer?.(fieldValue) ?? (fieldValue as JSONValue),
    ),
  );

  checkQueryStringLimit(searchParams);
  replaceHistoryState(searchParams);
};

/**
 * Deserializes a form from a query string.
 *
 * @param fieldsConfig - Configuration object for the form fields, including deserializer functions.
 * @param formName - The name of the form to deserialize.
 *
 * @returns The deserialized form object, or undefined if the form data is not found in the query string.
 */
export const deserializeFormFromQueryString = <
  Form extends HoneyFormBaseForm,
  FormContext = undefined,
>(
  fieldsConfig: HoneyFormBaseFieldsConfig<Form, FormContext>,
  formName: string,
): Form | undefined => {
  const searchParams = new URLSearchParams(window.location.search);
  const rawFormData = searchParams.get(formName);

  return rawFormData
    ? deserializeForm(rawFormData, (fieldName, rawValue) => {
        const fieldConfig = fieldsConfig[fieldName];

        return fieldConfig.deserializer?.(rawValue) ?? (rawValue as Form[typeof fieldName]);
      })
    : undefined;
};
