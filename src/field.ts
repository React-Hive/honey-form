import { createRef } from 'react';
import {
  isFunction,
  isString,
  isPromise,
  noop,
  isNil,
  isNumber,
  assert,
  isBool,
  invokeIfFunction,
} from '@react-hive/honey-utils';
import type { HTMLAttributes, HTMLInputTypeAttribute, RefObject } from 'react';

import { HONEY_FORM_ERRORS } from './constants';
import {
  INTERACTIVE_FIELD_TYPE_VALIDATORS_MAP,
  BUILT_IN_FIELD_VALIDATORS,
  BUILT_IN_INTERACTIVE_FIELD_VALIDATORS,
  PASSIVE_FIELD_TYPE_VALIDATORS_MAP,
} from './validators';
import {
  isInteractiveField,
  isPassiveField,
  isObjectField,
  isNestedFormsField,
  isPolymorphicField,
  isSkipField,
  forEachFormField,
  getFormValues,
  scheduleFieldValidation,
  mapFormFields,
} from './helpers';
import type {
  Nullable,
  KeysWithArrayValues,
  HoneyFormBaseForm,
  HoneyFormBaseExecutionContext,
  HoneyFormFields,
  HoneyFormFieldsValidationController,
  HoneyFormFieldBaseHTMLAttributes,
  HoneyFormFieldConfig,
  HoneyFormFieldError,
  HoneyFormField,
  HoneyFormFieldType,
  HoneyFormFieldValidationResult,
  HoneyFormFieldValueNormalizer,
  HoneyFormFieldSetValueInternal,
  HoneyFormFieldPushValue,
  HoneyFormFieldRemoveValue,
  HoneyFormFieldAddErrors,
  HoneyFormFieldClearErrors,
  HoneyFormFieldProps,
  HoneyFormFieldMeta,
  HoneyFormFieldFinishAsyncValidation,
  HoneyFormFieldsRef,
  HoneyFormDefaultsRef,
  HoneyFormInteractiveFieldConfig,
  HoneyFormPassiveFieldConfig,
  HoneyFormPassiveFieldProps,
  HoneyFormInteractiveFieldProps,
  HoneyFormValidateField,
  HoneyFormParentField,
} from './types';

const FIELD_TYPE_TO_INPUT_TYPE_MAP: Partial<Record<HoneyFormFieldType, HTMLInputTypeAttribute>> = {
  email: 'email',
  checkbox: 'checkbox',
  radio: 'radio',
  file: 'file',
};

const FIELD_TYPE_TO_INPUT_MODE_MAP: Partial<
  Record<HoneyFormFieldType, HTMLAttributes<HTMLInputElement>['inputMode']>
> = {
  email: 'email',
  number: 'numeric',
  numeric: 'numeric',
};

const DEFAULT_FIELD_VALUE_NORMALIZATION_CONFIG: Partial<
  Record<HoneyFormFieldType, HoneyFormFieldValueNormalizer<any>>
> = {
  number: (value: number | string | undefined) => {
    if (isString(value) && value) {
      // Should replace the thousand separators because they can be added by number filter
      return Number(value.replace(/,/g, ''));
    }

    return isNumber(value) ? value : undefined;
  },
};

/**
 * Normalizes a form field value according to its field type.
 *
 * If a value convertor is registered for the given field type in
 * `DEFAULT_FIELD_VALUE_CONVERTORS_MAP`, the convertor is applied to
 * transform the value into its canonical internal representation.
 *
 * If no convertor exists (or the field type is undefined), the original
 * value is returned unchanged.
 *
 * This function is used to ensure that field values are stored and
 * processed in a consistent, type-safe format before validation,
 * dependency resolution, and submission.
 *
 * @typeParam Form - The form shape.
 * @typeParam FieldName - The field name within the form.
 * @typeParam FieldValue - The value type of the field.
 *
 * @param fieldType - The type of the form field used to resolve the appropriate value convertor.
 * @param fieldValue - The current value of the field to normalize.
 *
 * @returns The normalized field value, or the original value if no convertor is available.
 */
const normalizeFieldValue = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FieldValue extends Form[FieldName],
>(
  fieldType: HoneyFormFieldType | undefined,
  fieldValue: FieldValue | undefined,
) => {
  const valueConvertor = fieldType
    ? (DEFAULT_FIELD_VALUE_NORMALIZATION_CONFIG[
        fieldType
      ] as HoneyFormFieldValueNormalizer<FieldValue>)
    : null;

  return valueConvertor ? valueConvertor(fieldValue) : fieldValue;
};

/**
 * Gets the base HTML attributes for a form field.
 *
 * @param fieldName - The name of the field.
 * @param formFieldRef - Reference to the form field element.
 * @param fieldConfig - Configuration options for the field.
 *
 * @returns The base HTML attributes for the form field.
 */
const getBaseFieldProps = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  fieldName: FieldName,
  formFieldRef: RefObject<HTMLElement>,
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext>,
): HoneyFormFieldBaseHTMLAttributes<any> => {
  return {
    ref: formFieldRef,
    type: FIELD_TYPE_TO_INPUT_TYPE_MAP[fieldConfig.type],
    name: fieldName.toString(),
    // ARIA
    'aria-required': fieldConfig.required !== false && !isFunction(fieldConfig.required),
    'aria-invalid': false,
  };
};

/**
 * Gets the appropriate input mode for a given form field based on its configuration.
 *
 * @remarks
 * This function is useful for setting the `inputMode` attribute of HTML input elements.
 *
 * @param fieldConfig - The configuration of the form field.
 *
 * @returns The HTML input mode for the field, or `undefined` if not specified.
 */
const getInteractiveFieldInputMode = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext>,
): HTMLAttributes<HTMLInputElement>['inputMode'] | undefined => {
  if (fieldConfig.type === 'number' && fieldConfig.decimal) {
    return 'decimal';
  }

  return FIELD_TYPE_TO_INPUT_MODE_MAP[fieldConfig.type];
};

interface InteractiveFieldPropsOptions<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
> {
  formFieldRef: RefObject<HTMLElement>;
  fieldConfig: HoneyFormInteractiveFieldConfig<Form, FieldName, FormContext>;
  setFieldValue: HoneyFormFieldSetValueInternal<Form>;
}

/**
 * Gets the interactive field properties for a form field.
 *
 * @param fieldName - The name of the field.
 * @param fieldValue - The current value of the field.
 * @param options - Options for interactive field properties.
 *
 * @returns The interactive field properties.
 */
const getInteractiveFormFieldProps = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName],
>(
  fieldName: FieldName,
  fieldValue: FieldValue,
  {
    formFieldRef,
    fieldConfig,
    setFieldValue,
  }: InteractiveFieldPropsOptions<Form, FieldName, FormContext>,
): HoneyFormInteractiveFieldProps => {
  const baseFieldProps = getBaseFieldProps(fieldName, formFieldRef, fieldConfig);

  return {
    ...baseFieldProps,
    value: isNil(fieldValue) ? '' : String(fieldValue),
    inputMode: getInteractiveFieldInputMode(fieldConfig),
    onClick: () => {
      // touched field
    },
    onChange: e => {
      setFieldValue(fieldName, e.target.value, {
        validate: fieldConfig.mode === 'change',
        format: !fieldConfig.formatOnBlur,
      });
    },
    ...((fieldConfig.mode === 'blur' || fieldConfig.formatOnBlur) && {
      onBlur: e => {
        if (!e.target.readOnly) {
          setFieldValue(fieldName, e.target.value);
        }
      },
    }),
    // Additional field properties from field configuration
    ...fieldConfig.props,
    // ARIA
    'aria-busy': false,
  };
};

interface PassiveFieldPropsOptions<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
> {
  formFieldRef: RefObject<HTMLElement>;
  fieldConfig: HoneyFormPassiveFieldConfig<Form, FieldName, FormContext>;
  setFieldValue: HoneyFormFieldSetValueInternal<Form>;
}

/**
 * Gets the passive field properties for a form field.
 *
 * @param fieldName - The name of the field.
 * @param options - Options for passive field properties.
 *
 * @returns The passive field properties.
 */
const getPassiveFormFieldProps = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  fieldName: FieldName,
  {
    formFieldRef,
    fieldConfig,
    setFieldValue,
  }: PassiveFieldPropsOptions<Form, FieldName, FormContext>,
): HoneyFormPassiveFieldProps => {
  const baseFieldProps = getBaseFieldProps(fieldName, formFieldRef, fieldConfig);

  return {
    ...baseFieldProps,
    ...(fieldConfig.type === 'checkbox' && {
      checked: (fieldConfig.defaultValue as boolean) ?? false,
    }),
    //
    onChange: e => {
      let newFieldValue: Form[FieldName];

      if (fieldConfig.type === 'checkbox') {
        newFieldValue = e.target.checked as Form[FieldName];
        //
      } else if (fieldConfig.type === 'file') {
        newFieldValue = e.target.files as Form[FieldName];
        //
      } else {
        newFieldValue = e.target.value as Form[FieldName];
      }

      setFieldValue(fieldName, newFieldValue, {
        format: false,
      });
    },
    // Additional field properties from field configuration
    ...fieldConfig.props,
  };
};

interface FieldPropsOptions<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
> {
  formFieldRef: RefObject<HTMLElement>;
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext>;
  setFieldValue: HoneyFormFieldSetValueInternal<Form>;
}

/**
 * Retrieves the properties for a form field based on its type.
 *
 * This function determines the type of the form field (interactive, passive, or object)
 * and returns the appropriate properties for that field type. It ensures the form field
 * has the necessary configuration and handlers for proper functioning within the form.
 *
 * @param fieldName - The name of the form field.
 * @param fieldValue - The current value of the form field.
 * @param options - Additional options for retrieving field properties.
 *
 * @returns The properties for the form field based on its type.
 */
const getFormFieldProps = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName],
>(
  fieldName: FieldName,
  fieldValue: FieldValue,
  { formFieldRef, fieldConfig, setFieldValue }: FieldPropsOptions<Form, FieldName, FormContext>,
): HoneyFormFieldProps => {
  if (isInteractiveField(fieldConfig)) {
    return {
      passiveProps: undefined,
      props: getInteractiveFormFieldProps(fieldName, fieldValue, {
        formFieldRef,
        fieldConfig,
        setFieldValue,
      }),
    };
  }

  if (isPassiveField(fieldConfig)) {
    return {
      props: undefined,
      passiveProps: getPassiveFormFieldProps(fieldName, {
        formFieldRef,
        fieldConfig,
        setFieldValue,
      }),
    };
  }

  return {
    props: undefined,
    passiveProps: undefined,
  };
};

interface CreateFormFieldOptions<Form extends HoneyFormBaseForm, FormContext> {
  executionContext: HoneyFormBaseExecutionContext<Form, FormContext>;
  formFieldsRef: HoneyFormFieldsRef<Form, FormContext>;
  formDefaultsRef: HoneyFormDefaultsRef<Form>;
}

interface CreateFormFieldApiAccess<Form extends HoneyFormBaseForm> {
  setFieldValue: HoneyFormFieldSetValueInternal<Form>;
  clearFieldErrors: HoneyFormFieldClearErrors<Form>;
  validateField: HoneyFormValidateField<Form>;
  pushFieldValue: HoneyFormFieldPushValue<Form>;
  removeFieldValue: HoneyFormFieldRemoveValue<Form>;
  addFormFieldErrors: HoneyFormFieldAddErrors<Form>;
}

/**
 * Creates a form field with the specified configuration and initial setup.
 *
 * This function initializes a form field by setting its configuration, default values,
 * event handlers, and other necessary properties. It ensures the form field is properly
 * integrated within the form context and maintains its state throughout the form's lifecycle.
 *
 * @param fieldName - The name of the form field to be created.
 * @param fieldConfig - The configuration for the form field.
 * @param options - Additional options for field creation, including context and various handlers.
 *
 * @returns The created form field with all its properties and methods.
 */
export const createFormField = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  fieldName: FieldName,
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext>,
  { executionContext, formFieldsRef, formDefaultsRef }: CreateFormFieldOptions<Form, FormContext>,
  {
    setFieldValue,
    clearFieldErrors,
    validateField,
    pushFieldValue,
    removeFieldValue,
    addFormFieldErrors,
  }: CreateFormFieldApiAccess<Form>,
): HoneyFormField<Form, FieldName, FormContext> => {
  formDefaultsRef.current[fieldName] = fieldConfig.defaultValue;

  const filteredValue =
    isInteractiveField(fieldConfig) && fieldConfig.filter
      ? fieldConfig.filter(fieldConfig.defaultValue, executionContext)
      : fieldConfig.defaultValue;

  const resultValue =
    isInteractiveField(fieldConfig) && fieldConfig.formatter
      ? fieldConfig.formatter(filteredValue, executionContext)
      : filteredValue;

  const fieldMeta: HoneyFormFieldMeta<Form, FormContext> = {
    formFieldsRef,
    validationScheduled: false,
    childForms: undefined,
  };

  const formFieldRef = createRef<HTMLElement>();

  const resultFieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext> = {
    required: false,
    resetOnDependencyToDefault: false,
    ...(isInteractiveField(fieldConfig) && {
      // Set the default config values
      mode: 'change',
      formatOnBlur: false,
      submitFormattedValue: false,
    }),
    ...(isObjectField(fieldConfig) && {
      allowEmptyArray: false,
      allowEmptyArrayValues: false,
    }),
    ...fieldConfig,
  };

  const fieldProps = getFormFieldProps(fieldName, resultValue, {
    formFieldRef,
    setFieldValue,
    fieldConfig: resultFieldConfig,
  });

  const normalizedValue = normalizeFieldValue(resultFieldConfig.type, filteredValue);

  return {
    ...fieldProps,
    normalizedValue,
    ref: formFieldRef,
    config: resultFieldConfig,
    errors: [],
    defaultValue: resultFieldConfig.defaultValue,
    rawValue: filteredValue,
    initialNormalizedValue: normalizedValue,
    displayValue: resultValue,
    isDirty: false,
    isValidating: false,
    // TODO: try to fix the next error
    // @ts-expect-error
    getChildFormsValues: () => {
      return (
        fieldMeta.childForms?.map(childForm => {
          const childFormFields = childForm.formFieldsRef.current;
          assert(childFormFields, HONEY_FORM_ERRORS.emptyFormFieldsRef);

          return getFormValues(childFormFields);
          // Return field value when child forms are not mounted yet at the beginning, but the field value is set as initial value
        }) ?? resultValue
      );
    },
    __meta__: fieldMeta,
    // FUNCTIONS
    setValue: (value, options) => setFieldValue(fieldName, value, options),
    pushValue: value => pushFieldValue(fieldName, value),
    removeValue: formIndex => removeFieldValue(fieldName, formIndex),
    resetValue: () =>
      setFieldValue(fieldName, formDefaultsRef.current[fieldName], {
        dirty: false,
      }),
    addErrors: errors => addFormFieldErrors(fieldName, errors),
    addError: error => addFormFieldErrors(fieldName, [error]),
    clearErrors: () => clearFieldErrors(fieldName),
    validate: () => validateField(fieldName),
    focus: () => {
      assert(formFieldRef.current, HONEY_FORM_ERRORS.emptyFormFieldsRef);

      formFieldRef.current.focus();
    },
  };
};

/**
 * Returns the updated state of a form field with all errors cleared.
 *
 * This function processes the form field to reset its error-related properties,
 * ensuring that the field is marked as valid by setting the `aria-invalid` attribute to `false`
 * and clearing any existing error messages. It also resets the `normalizedValue` property to `undefined`.
 *
 * @param formField - The current state of the form field to be updated.
 *
 * @returns The updated state of the form field with errors cleared and validation status reset.
 */
export const getNextErrorsFreeField = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  formField: HoneyFormField<Form, FieldName, FormContext>,
): HoneyFormField<Form, FieldName, FormContext> => {
  const props: HoneyFormInteractiveFieldProps | undefined = isInteractiveField(formField.config)
    ? {
        ...formField.props,
        'aria-invalid': false,
      }
    : undefined;

  const passiveProps: HoneyFormPassiveFieldProps | undefined = isPassiveField(formField.config)
    ? {
        ...formField.passiveProps,
        'aria-invalid': false,
      }
    : undefined;

  return {
    ...formField,
    props,
    passiveProps,
    normalizedValue: undefined,
    errors: [],
  };
};

/**
 * Returns the next state of a form field with specified errors.
 *
 * @param formField - The current state of the form field.
 * @param fieldErrors - The errors to be set on the form field.
 *
 * @returns The next state with specified errors.
 */
export const getNextErredField = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  formField: HoneyFormField<Form, FieldName, FormContext>,
  fieldErrors: HoneyFormFieldError[],
): HoneyFormField<Form, FieldName, FormContext> => {
  const isFieldErred = fieldErrors.length > 0;

  const props: HoneyFormInteractiveFieldProps | undefined = isInteractiveField(formField.config)
    ? {
        ...formField.props,
        'aria-invalid': isFieldErred,
      }
    : undefined;

  const passiveProps: HoneyFormPassiveFieldProps | undefined = isPassiveField(formField.config)
    ? {
        ...formField.passiveProps,
        'aria-invalid': isFieldErred,
      }
    : undefined;

  return {
    ...formField,
    props,
    passiveProps,
    errors: fieldErrors,
    // Set a normalized value as `undefined` if any error is present
    normalizedValue: fieldErrors.length ? undefined : formField.normalizedValue,
  };
};

/**
 * Retrieves the next state of a form field after resetting its values and clearing all field errors.
 *
 * @param formField - The form field to reset.
 * @param shouldResetToDefault - Indicates whether the field should be reset to its default value.
 *
 * @returns The next state of the form field after resetting.
 */
export const getNextResetField = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  formField: HoneyFormField<Form, FieldName, FormContext>,
  shouldResetToDefault: boolean,
): HoneyFormField<Form, FieldName, FormContext> => {
  const errorsFreeField = getNextErrorsFreeField(formField);

  const nextFieldValue = shouldResetToDefault ? errorsFreeField.defaultValue : undefined;

  const props: HoneyFormInteractiveFieldProps | undefined = isInteractiveField(formField.config)
    ? {
        ...errorsFreeField.props,
        value: isNil(nextFieldValue) ? '' : String(nextFieldValue),
      }
    : undefined;

  const passiveProps: HoneyFormPassiveFieldProps | undefined = isPassiveField(formField.config)
    ? {
        ...errorsFreeField.passiveProps,
        ...(formField.config.type === 'checkbox' && {
          checked: nextFieldValue as boolean,
        }),
      }
    : undefined;

  return {
    ...errorsFreeField,
    props,
    passiveProps,
    displayValue: nextFieldValue,
    rawValue: nextFieldValue,
    normalizedValue: nextFieldValue,
  };
};

/**
 * Handle the result of field validation and update the field errors array accordingly.
 *
 * @param executionContext - The execution context providing form-wide information,
 *                           including field configurations, current form values,
 *                           and helper functions for validation scheduling.
 * @param fieldErrors - The array to collect validation errors for the field.
 * @param fieldConfig - Configuration for the field being validated.
 * @param validationResult - The result of the field validation.
 */
const handleFieldValidationResult = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  executionContext: HoneyFormBaseExecutionContext<Form, FormContext>,
  fieldErrors: HoneyFormFieldError[],
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext>,
  validationResult: Nullable<HoneyFormFieldValidationResult>,
) => {
  if (validationResult) {
    if (Array.isArray(validationResult)) {
      fieldErrors.push(...validationResult);
    }
    // If the result is not a boolean, treat it as an invalid value and add it to fieldErrors
    else if (!isBool(validationResult)) {
      fieldErrors.push({
        type: 'invalid',
        message: validationResult,
      });
    }
  }
  // If validationResult is explicitly false, add a default invalid value error
  else if (validationResult === false) {
    fieldErrors.push({
      type: 'invalid',
      message:
        invokeIfFunction(fieldConfig.errorMessages?.invalid, executionContext) ?? 'Invalid value',
    });
  }
};

/**
 * Updates the form field to indicate it is currently undergoing asynchronous validation.
 *
 * @param formField - The form field to update.
 *
 * @returns The updated form field with asynchronous validation status.
 */
const getNextAsyncValidatingField = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  formField: HoneyFormField<Form, FieldName, FormContext>,
): HoneyFormField<Form, FieldName, FormContext> => {
  const errorsFreeField = getNextErrorsFreeField(formField);

  return {
    ...errorsFreeField,
    isValidating: true,
    props: {
      ...errorsFreeField.props,
      'aria-busy': true,
    },
  };
};

/**
 * Updates the form field to indicate it has completed asynchronous validation.
 *
 * @param formField - The form field to update.
 *
 * @returns The updated form field with asynchronous validation completed.
 */
export const getNextAsyncValidatedField = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  formField: HoneyFormField<Form, FieldName, FormContext>,
): HoneyFormField<Form, FieldName, FormContext> => ({
  ...formField,
  isValidating: false,
  props: {
    ...formField.props,
    'aria-busy': false,
  },
});

/**
 * Get the next validated field based on validation results and field errors.
 *
 * @param executionContext - The execution context providing form-wide information,
 *                           including field configurations, current form values,
 *                           and helper functions for validation scheduling.
 * @param fieldErrors - The array of validation errors for the field.
 * @param validationResult - The result of the field validation.
 * @param formField - The form field being validated.
 * @param normalizedValue - The cleaned value of the field.
 *
 * @returns The next form field state after validation.
 */
const getNextValidatedField = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  executionContext: HoneyFormBaseExecutionContext<Form, FormContext>,
  fieldErrors: HoneyFormFieldError[],
  validationResult: Nullable<HoneyFormFieldValidationResult>,
  formField: HoneyFormField<Form, FieldName, FormContext>,
  normalizedValue: Form[FieldName] | undefined,
): HoneyFormField<Form, FieldName, FormContext> => {
  handleFieldValidationResult(executionContext, fieldErrors, formField.config, validationResult);

  if (fieldErrors.length) {
    return getNextErredField(formField, fieldErrors);
  }

  const errorsFreeField = getNextErrorsFreeField(formField);

  return {
    ...errorsFreeField,
    normalizedValue,
  };
};

/**
 * Executes the validator associated with the type of a specific form field.
 *
 * @param executionContext - The execution context providing form-wide information,
 *                           including field configurations, current form values,
 *                           and helper functions for validation scheduling.
 * @param formField - The current state of the form field, including its configuration.
 * @param fieldValue - The current value of the form field.
 *
 * @returns The result of the field type validation, or `null` if validation is not applicable.
 */
const executeFieldTypeValidator = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName],
>(
  executionContext: HoneyFormBaseExecutionContext<Form, FormContext>,
  formField: HoneyFormField<Form, FieldName, FormContext>,
  fieldValue: FieldValue | undefined,
): Nullable<HoneyFormFieldValidationResult> => {
  if (
    isObjectField(formField.config) ||
    isNestedFormsField(formField.config) ||
    isPolymorphicField(formField.config)
  ) {
    return null;
  }

  let validationResult: Nullable<
    HoneyFormFieldValidationResult | Promise<HoneyFormFieldValidationResult>
  > = null;

  if (isInteractiveField(formField.config)) {
    // Get the validator function associated with the field type
    const validator = INTERACTIVE_FIELD_TYPE_VALIDATORS_MAP[formField.config.type];

    validationResult = validator(fieldValue, {
      ...executionContext,
      fieldConfig: formField.config,
      signal: undefined,
      scheduleValidation: fieldName =>
        scheduleFieldValidation(executionContext.formFields[fieldName]),
    });
  } else if (isPassiveField(formField.config)) {
    const validator = PASSIVE_FIELD_TYPE_VALIDATORS_MAP[formField.config.type];

    validationResult = validator(fieldValue, {
      ...executionContext,
      fieldConfig: formField.config,
      signal: undefined,
      scheduleValidation: fieldName =>
        scheduleFieldValidation(executionContext.formFields[fieldName]),
    });
  }

  if (!isPromise(validationResult)) {
    return validationResult;
  }

  // If the validation response is a Promise, return null
  return null;
};

interface ExecuteInternalFieldValidatorsOptions<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> {
  executionContext: HoneyFormBaseExecutionContext<Form, FormContext>;
  fieldValue: FieldValue | undefined;
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext>;
  fieldErrors: HoneyFormFieldError[];
}

/**
 * Executes internal field validators for a given form field.
 *
 * @remarks
 * This function iterates over built-in field validators and executes them for the specified field.
 */
const executeInternalFieldValidators = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  validatorOptions: ExecuteInternalFieldValidatorsOptions<Form, FieldName, FormContext>,
) => {
  BUILT_IN_FIELD_VALIDATORS.forEach(validator => {
    validator(validatorOptions);
  });

  const fieldConfig = validatorOptions.fieldConfig;

  if (isInteractiveField(fieldConfig)) {
    BUILT_IN_INTERACTIVE_FIELD_VALIDATORS.forEach(validator => {
      validator({
        ...validatorOptions,
        fieldConfig,
      });
    });
  }
};

/**
 * Handles the result of a promise-based field validation, updating the form field with appropriate errors.
 *
 * This function processes the result of a promise returned by a field validation function. It adds validation errors
 * to the form field based on the resolved value of the promise. If the promise is rejected, it adds an error with the
 * rejection reason.
 *
 * @param executionContext - The execution context providing form-wide information,
 *                           including field configurations, current form values,
 *                           and helper functions for validation scheduling.
 * @param formField - The form field being validated.
 * @param validationResponse - The promise representing the result of the validation.
 */
const handleFieldAsyncValidationResult = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  executionContext: HoneyFormBaseExecutionContext<Form, FormContext>,
  formField: HoneyFormField<Form, FieldName, FormContext>,
  validationResponse: Promise<HoneyFormFieldValidationResult>,
): Promise<void> =>
  validationResponse
    .then(validationResult => {
      if (validationResult) {
        if (Array.isArray(validationResult)) {
          formField.addErrors(validationResult);
          //
        } else if (!isBool(validationResult)) {
          formField.addError({
            type: 'invalid',
            message: validationResult,
          });
        }
      } else if (validationResult === false) {
        formField.addError({
          type: 'invalid',
          message:
            invokeIfFunction(formField.config.errorMessages?.invalid, executionContext) ??
            'Invalid value',
        });
      }
    })
    .catch((validationResult: Error) => {
      if (validationResult.name === 'CanceledError') {
        // Throws from axios when HTTP request is aborted using signal (AbortController)
      } else {
        formField.addError({
          type: 'invalid',
          message:
            invokeIfFunction(formField.config.errorMessages?.invalid, executionContext) ??
            validationResult.message,
        });
      }
    });

/**
 * Updates the validation controller for a specific form field, ensuring that any
 * ongoing asynchronous validation is aborted before assigning a new controller.
 *
 * @param formFieldsValidationControllerRef - A reference to the validation controllers for each field in the form.
 * @param fieldName - The name of the field whose validation controller should be updated.
 *
 * @returns The newly created `AbortController` instance for the field.
 */
const updateFormFieldValidationController = <Form extends HoneyFormBaseForm>(
  formFieldsValidationControllerRef: RefObject<HoneyFormFieldsValidationController<Form>>,
  fieldName: keyof Form,
): AbortController => {
  // Abort the existing validation controller for the field, if any
  formFieldsValidationControllerRef.current[fieldName]?.abort();

  const fieldValidationController = new AbortController();
  formFieldsValidationControllerRef.current[fieldName] = fieldValidationController;

  return fieldValidationController;
};

/**
 * Options for executing the validator for a specific form field.
 */
interface ExecuteFieldValidatorOptions<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName],
> {
  executionContext: HoneyFormBaseExecutionContext<Form, FormContext>;
  /**
   * A reference to the validation controllers for each field in the form,
   * enabling management and cancellation of ongoing asynchronous validations.
   */
  formFieldsValidationControllerRef: RefObject<HoneyFormFieldsValidationController<Form>>;
  /**
   * The name of the field to validate.
   */
  fieldName: FieldName;
  /**
   * The value of the field.
   */
  fieldValue: FieldValue | undefined;
  /**
   * Callback function to complete asynchronous validation for the field.
   *
   * This function should be called once the asynchronous validation process is finished to indicate
   * that the field's validation status has been resolved.
   */
  finishFieldAsyncValidation: HoneyFormFieldFinishAsyncValidation<Form, FieldName>;
}

/**
 * Executes the validator for a specific form field and returns the next state of the field.
 *
 * @param options - Options for executing the field validator.
 *
 * @returns The next state of the validated field.
 */
export const executeFieldValidator = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName],
>({
  executionContext,
  formFieldsValidationControllerRef,
  fieldName,
  fieldValue,
  finishFieldAsyncValidation,
}: ExecuteFieldValidatorOptions<Form, FieldName, FormContext, FieldValue>): HoneyFormField<
  Form,
  FieldName,
  FormContext
> => {
  let nextFormField = executionContext.formFields[fieldName];

  const fieldErrors: HoneyFormFieldError[] = [];

  const normalizedValue = normalizeFieldValue(nextFormField.config.type, fieldValue);

  let validationResult = executeFieldTypeValidator(
    executionContext,
    nextFormField,
    normalizedValue,
  );

  // Don't run additional validators if the default field type validator failed
  if (validationResult === null || validationResult === true) {
    executeInternalFieldValidators({
      executionContext,
      fieldErrors,
      fieldValue: normalizedValue,
      fieldConfig: nextFormField.config,
    });

    // Execute custom validator. Can only run when the default validator returns true
    if (nextFormField.config.validator) {
      const fieldValidationController = updateFormFieldValidationController(
        formFieldsValidationControllerRef,
        fieldName,
      );

      const validationResponse = nextFormField.config.validator(normalizedValue, {
        ...executionContext,
        // @ts-expect-error
        fieldConfig: nextFormField.config,
        signal: fieldValidationController.signal,
        scheduleValidation: fieldName =>
          scheduleFieldValidation(executionContext.formFields[fieldName]),
      });

      if (isPromise(validationResponse)) {
        nextFormField = getNextAsyncValidatingField(nextFormField);

        handleFieldAsyncValidationResult(executionContext, nextFormField, validationResponse)
          .catch(noop)
          .finally(() => finishFieldAsyncValidation(fieldName));

        return nextFormField;
      } else {
        validationResult = validationResponse;
      }
    }
  }

  return getNextValidatedField(
    executionContext,
    fieldErrors,
    validationResult,
    nextFormField,
    normalizedValue,
  );
};

/**
 * Options for executing the field validator asynchronously.
 */
interface ExecuteFieldValidatorAsyncOptions<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
> {
  executionContext: HoneyFormBaseExecutionContext<Form, FormContext>;
  /**
   * A reference to the validation controllers for each field in the form,
   * enabling management and cancellation of ongoing asynchronous validations.
   */
  formFieldsValidationControllerRef: RefObject<HoneyFormFieldsValidationController<Form>>;
  /**
   * The parent field of the current field, if any.
   */
  parentField: HoneyFormParentField<ParentForm, ParentFieldName> | undefined;
  /**
   * The name of the field to validate.
   */
  fieldName: FieldName;
  /**
   * Whether to update the form fields with validation errors.
   * `true` applies errors to the form, `false` validates silently.
   */
  shouldSetErrors: boolean;
}

/**
 * Asynchronously execute the validator for a specific form field.
 *
 * @param options - The options for executing the field validator.
 *
 * @returns The next state of the validated field.
 */
export const executeFieldValidatorAsync = async <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>({
  executionContext,
  formFieldsValidationControllerRef,
  parentField,
  fieldName,
  shouldSetErrors,
}: ExecuteFieldValidatorAsyncOptions<
  ParentForm,
  ParentFieldName,
  Form,
  FieldName,
  FormContext
>) => {
  const formField = executionContext.formFields[fieldName];

  const fieldErrors: HoneyFormFieldError[] = [];

  let filteredValue: Form[FieldName] = formField.rawValue;

  if (isInteractiveField(formField.config)) {
    filteredValue = isString(filteredValue)
      ? // Use trimStart() to do not allow typing from a space
        ((filteredValue as string).trimStart() as Form[FieldName])
      : filteredValue;

    if (formField.config.filter) {
      filteredValue = formField.config.filter(filteredValue, executionContext);
    } else {
      filteredValue = formField.rawValue;
    }
  } else if (isNestedFormsField(formField.config)) {
    filteredValue = formField.getChildFormsValues() as Form[FieldName];
  }

  const sanitizedValue = normalizeFieldValue(formField.config.type, filteredValue);

  let validationResult = executeFieldTypeValidator(executionContext, formField, sanitizedValue);

  // Do not run additional validators if the default field type validator failed
  if (validationResult === null || validationResult === true) {
    executeInternalFieldValidators({
      executionContext,
      fieldErrors,
      fieldValue: sanitizedValue,
      fieldConfig: formField.config,
    });

    if (formField.config.validator) {
      const fieldValidationController = updateFormFieldValidationController(
        formFieldsValidationControllerRef,
        fieldName,
      );

      const validationResponse = formField.config.validator(sanitizedValue, {
        ...executionContext,
        // @ts-expect-error
        fieldConfig: formField.config,
        signal: fieldValidationController.signal,
        scheduleValidation: fieldName =>
          scheduleFieldValidation(executionContext.formFields[fieldName]),
      });

      // If the validation response is a Promise, so handle it asynchronously
      if (isPromise(validationResponse)) {
        try {
          validationResult = await validationResponse;
        } catch (e) {
          // If there's an error in the promise, set it as the validation result
          const error = e as Error;

          validationResult = error.message;
        }
      } else {
        validationResult = validationResponse;
      }
    }
  }

  if (shouldSetErrors) {
    return {
      fieldErrors,
      nextField: getNextValidatedField(
        executionContext,
        fieldErrors,
        validationResult,
        formField,
        sanitizedValue,
      ),
    };
  }

  return {
    fieldErrors,
    nextField: formField,
  };
};

/**
 * Options for processing the skippable fields.
 */
interface ProcessSkippableFieldsOptions<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FormContext,
> {
  executionContext: HoneyFormBaseExecutionContext<Form, FormContext>;
  /**
   * The parent form field.
   */
  parentField: HoneyFormParentField<ParentForm, ParentFieldName> | undefined;
}

/**
 * Checks and clears errors for fields that should be skipped based on the current field's value.
 *
 * @param options - The options for processing skippable fields.
 */
export const processSkippableFields = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FormContext,
>({
  executionContext,
  parentField,
}: ProcessSkippableFieldsOptions<ParentForm, ParentFieldName, Form, FormContext>) =>
  mapFormFields(executionContext.formFields, (fieldName, formField) => {
    const shouldSkipField = isSkipField({
      executionContext,
      parentField,
      fieldName,
    });

    return shouldSkipField ? getNextErrorsFreeField(formField) : formField;
  });

/**
 * Resets all fields in the form to their default values and clears validation errors.
 *
 * @param formFields - The current state of form fields to be reset.
 *
 * @returns A new object where all form fields have been reset to their default state.
 */
export const resetAllFields = <Form extends HoneyFormBaseForm, FormContext>(
  formFields: HoneyFormFields<Form, FormContext>,
) => mapFormFields(formFields, (fieldName, formField) => getNextResetField(formField, true));

/**
 * Recursively resets fields to their default values based on dependency relationships.
 *
 * When a specific field is updated or changed, any other fields that depend on it (either
 * directly or through nested dependencies) are reset to their default state.
 *
 * This helps maintain form integrity when changes in one field affect others.
 *
 * @param executionContext - The current form execution context, including all form field values and metadata.
 * @param fieldName - The name of the field that triggered the reset (i.e., the field that was changed).
 * @param [initiatorFieldName] - The name of the original field that started the reset chain.
 *                               Used to prevent infinite recursion and distinguish between initiator and dependent.
 *
 * @returns A new `formFields` object with updated fields, where dependent fields are reset to their default values.
 */
export const resetDependentFields = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  executionContext: HoneyFormBaseExecutionContext<Form, FormContext>,
  fieldName: FieldName,
  initiatorFieldName: Nullable<FieldName> = null,
) => {
  initiatorFieldName = initiatorFieldName || fieldName;

  let nextFormFields = { ...executionContext.formFields };

  forEachFormField(nextFormFields, otherFieldName => {
    if (otherFieldName === fieldName) {
      return;
    }

    const { dependsOn } = nextFormFields[otherFieldName].config;

    let isDependent: boolean;

    if (Array.isArray(dependsOn)) {
      isDependent = dependsOn.includes(fieldName);
      //
    } else if (isFunction(dependsOn)) {
      isDependent = dependsOn(
        initiatorFieldName,
        nextFormFields[otherFieldName].normalizedValue,
        executionContext,
      );
    } else {
      isDependent = fieldName === dependsOn;
    }

    if (isDependent) {
      const otherField = nextFormFields[otherFieldName];

      nextFormFields[otherFieldName] = getNextResetField(
        otherField,
        otherField.config.resetOnDependencyToDefault,
      );

      if (otherFieldName !== initiatorFieldName) {
        nextFormFields = resetDependentFields(
          {
            ...executionContext,
            formFields: nextFormFields,
          },
          otherFieldName,
          fieldName,
        );
      }
    }
  });

  return nextFormFields;
};

/**
 * Options for triggering scheduled validations on form fields.
 */
interface TriggerScheduledFieldsValidationsOptions<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
> {
  executionContext: HoneyFormBaseExecutionContext<Form, FormContext>;
  /**
   * A reference to the validation controllers for each field in the form,
   * enabling management and cancellation of ongoing asynchronous validations.
   */
  formFieldsValidationControllerRef: RefObject<HoneyFormFieldsValidationController<Form>>;
  /**
   * The parent form field.
   */
  parentField: HoneyFormParentField<ParentForm, ParentFieldName> | undefined;
  /**
   * The name of the field triggering validations.
   */
  fieldName: FieldName;
  /**
   * Callback function to complete asynchronous validation for the field.
   *
   * This function should be called once the asynchronous validation process is finished to indicate
   * that the field's validation status has been resolved.
   */
  finishFieldAsyncValidation: HoneyFormFieldFinishAsyncValidation<Form, FieldName>;
}

/**
 * Processes scheduled validations for form fields, triggering validation only for fields that
 * have pending validation requests.
 *
 * This function iterates through all form fields, checking if validation is scheduled for each field.
 * If validation is required, it applies the appropriate validation logic and updates the field state.
 *
 * @returns A new object containing updated form fields after processing scheduled validations.
 */
const processScheduledFieldsValidation = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>({
  executionContext,
  formFieldsValidationControllerRef,
  parentField,
  fieldName: targetFieldName,
  finishFieldAsyncValidation,
}: TriggerScheduledFieldsValidationsOptions<
  ParentForm,
  ParentFieldName,
  Form,
  FieldName,
  FormContext
>) =>
  mapFormFields(executionContext.formFields, (fieldName, formField) => {
    // Skip validations for the field triggering the change
    if (fieldName === targetFieldName) {
      return formField;
    }

    // Check if validation is scheduled for the field
    if (formField.__meta__.validationScheduled) {
      const shouldSkipField = isSkipField({
        executionContext,
        parentField,
        fieldName: fieldName,
      });

      let nextFormField = formField;

      if (!shouldSkipField) {
        let filteredValue: Form[keyof Form];

        if (isInteractiveField(formField.config)) {
          filteredValue = formField.config.filter
            ? formField.config.filter(formField.rawValue, executionContext)
            : formField.rawValue;
          //
        } else if (isNestedFormsField(formField.config)) {
          filteredValue = formField.getChildFormsValues() as Form[keyof Form];
          //
        } else {
          filteredValue = formField.rawValue;
        }

        nextFormField = executeFieldValidator({
          executionContext,
          formFieldsValidationControllerRef,
          finishFieldAsyncValidation,
          fieldName: fieldName,
          fieldValue: filteredValue,
        });
      }

      // Reset the validation scheduled flag for the field
      nextFormField.__meta__.validationScheduled = false;

      return nextFormField;
    }

    return formField;
  });

/**
 * Options for determining the next state of a single form field.
 */
interface NextFormFieldStateOptions<Form extends HoneyFormBaseForm, FormContext> {
  executionContext: HoneyFormBaseExecutionContext<Form, FormContext>;
  shouldFormat: boolean;
}

/**
 * Gets the next state of a single form field based on the provided field value.
 *
 * @param formField - The current state of the form field.
 * @param fieldValue - The new value for the form field.
 * @param options - Additional options for determining the next field state.
 *
 * @returns The next state of the form field.
 */
export const getNextFormFieldState = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FieldValue extends Form[FieldName],
  FormContext,
>(
  formField: HoneyFormField<Form, FieldName, FormContext>,
  fieldValue: FieldValue,
  { executionContext, shouldFormat }: NextFormFieldStateOptions<Form, FormContext>,
): HoneyFormField<Form, FieldName, FormContext> => {
  const formattedValue =
    shouldFormat && isInteractiveField(formField.config) && formField.config.formatter
      ? formField.config.formatter(fieldValue, executionContext)
      : fieldValue;

  const props: HoneyFormInteractiveFieldProps | undefined = isInteractiveField(formField.config)
    ? {
        ...formField.props,
        value: isNil(formattedValue) ? '' : String(formattedValue),
      }
    : undefined;

  const passiveProps: HoneyFormPassiveFieldProps | undefined = isPassiveField(formField.config)
    ? {
        ...formField.passiveProps,
        ...(formField.config.type === 'checkbox' && {
          checked: fieldValue as boolean,
        }),
      }
    : undefined;

  return {
    ...formField,
    props,
    passiveProps,
    rawValue: fieldValue,
    displayValue: formattedValue,
  };
};

/**
 * Options for determining the next state of form fields.
 */
interface NextFieldsStateOptions<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
> {
  executionContext: HoneyFormBaseExecutionContext<Form, FormContext>;
  /**
   * A reference to the validation controllers for each field in the form,
   * enabling management and cancellation of ongoing asynchronous validations.
   */
  formFieldsValidationControllerRef: RefObject<HoneyFormFieldsValidationController<Form>>;
  /**
   * The parent form field.
   */
  parentField: HoneyFormParentField<ParentForm, ParentFieldName> | undefined;
  /**
   * Flag indicating whether to validate the form fields.
   */
  validate: boolean;
  /**
   * Flag indicating whether to format the form fields.
   */
  format: boolean;
  /**
   * Callback function to complete asynchronous validation for the field.
   *
   * This function should be called once the asynchronous validation process is finished to indicate
   * that the field's validation status has been resolved.
   */
  finishFieldAsyncValidation: HoneyFormFieldFinishAsyncValidation<Form, FieldName>;
}

/**
 * Computes the next state of form fields after a change in a specific field.
 *
 * @param fieldName - The name of the field that changed.
 * @param fieldValue - The new value of the changed field.
 * @param options - Options for computing the next state.
 *
 * @returns The next state of form fields.
 */
export const getNextFieldsState = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FieldValue extends Form[FieldName],
  FormContext,
>(
  fieldName: FieldName,
  fieldValue: FieldValue | undefined,
  {
    executionContext,
    formFieldsValidationControllerRef,
    parentField,
    validate,
    format,
    finishFieldAsyncValidation,
  }: NextFieldsStateOptions<ParentForm, ParentFieldName, Form, FieldName, FormContext>,
): HoneyFormFields<Form, FormContext> => {
  let nextFormFields = { ...executionContext.formFields };

  let nextFormField = nextFormFields[fieldName];
  let filteredValue: Form[FieldName] = fieldValue;

  if (isInteractiveField(nextFormField.config)) {
    filteredValue = isString(fieldValue)
      ? ((fieldValue as string).trimStart() as Form[FieldName])
      : fieldValue;

    if (nextFormField.config.filter) {
      filteredValue = nextFormField.config.filter(filteredValue, executionContext);
    }
  }

  nextFormFields = resetDependentFields(executionContext, fieldName);

  if (validate) {
    nextFormField = executeFieldValidator({
      formFieldsValidationControllerRef,
      fieldName,
      finishFieldAsyncValidation,
      fieldValue: filteredValue,
      executionContext: {
        ...executionContext,
        formFields: nextFormFields,
        formValues: getFormValues(nextFormFields),
      },
    });
  } else {
    nextFormField = getNextErrorsFreeField(nextFormField);
  }

  nextFormFields[fieldName] = getNextFormFieldState(nextFormField, filteredValue, {
    shouldFormat: format,
    executionContext: {
      ...executionContext,
      formFields: nextFormFields,
      formValues: getFormValues(nextFormFields),
    },
  });

  nextFormFields[fieldName] = {
    ...nextFormFields[fieldName],
    isDirty: nextFormFields[fieldName].initialNormalizedValue !== nextFormField.normalizedValue,
  };

  const formValues = getFormValues(nextFormFields);

  nextFormFields = processSkippableFields({
    parentField,
    executionContext: {
      ...executionContext,
      formValues,
      formFields: nextFormFields,
    },
  });

  nextFormFields = processScheduledFieldsValidation({
    formFieldsValidationControllerRef,
    parentField,
    fieldName,
    finishFieldAsyncValidation,
    executionContext: {
      ...executionContext,
      formValues,
      formFields: nextFormFields,
    },
  });

  return nextFormFields;
};
