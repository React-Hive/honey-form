import type { HTMLAttributes, HTMLInputTypeAttribute, MutableRefObject, RefObject } from 'react';
import { createRef } from 'react';

import type {
  Nullable,
  HoneyFormBaseForm,
  BaseHoneyFormFieldHTMLAttributes,
  HoneyFormFieldConfig,
  HoneyFormFieldError,
  HoneyFormFields,
  HoneyFormField,
  HoneyFormFieldType,
  HoneyFormFieldValidationResult,
  HoneyFormFieldValueConvertor,
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
  HoneyFormObjectFieldProps,
  HoneyFormInteractiveFieldConfig,
  HoneyFormPassiveFieldConfig,
  HoneyFormObjectFieldConfig,
  HoneyFormPassiveFieldProps,
  HoneyFormInteractiveFieldProps,
  HoneyFormValidateField,
  HoneyFormParentField,
  KeysWithArrayValues,
  HoneyFormValues,
  HoneyFormValidationController,
} from './types';
import {
  INTERACTIVE_FIELD_TYPE_VALIDATORS_MAP,
  BUILT_IN_FIELD_VALIDATORS,
  BUILT_IN_INTERACTIVE_FIELD_VALIDATORS,
  PASSIVE_FIELD_TYPE_VALIDATORS_MAP,
} from './validators';
import {
  checkIfHoneyFormFieldIsInteractive,
  checkIfFieldIsNestedForms,
  checkIfFieldIsObject,
  checkIfFieldIsPassive,
  forEachFormField,
  getFormValues,
  checkIsSkipField,
  scheduleFieldValidation,
  noop,
  isPromise,
} from './helpers';
import { HONEY_FORM_ERRORS } from './constants';

const FIELD_TYPE_MAP: Partial<Record<HoneyFormFieldType, HTMLInputTypeAttribute>> = {
  email: 'email',
  checkbox: 'checkbox',
  radio: 'radio',
  file: 'file',
};

const DEFAULT_FIELD_VALUE_CONVERTORS_MAP: Partial<
  Record<HoneyFormFieldType, HoneyFormFieldValueConvertor<any>>
> = {
  number: (value: number | string | undefined) => {
    if (typeof value === 'string' && value) {
      // Try to replace thousands separators because they can be added by number filter
      return Number(value.replace(/,/g, ''));
    }

    return typeof value === 'number' ? value : undefined;
  },
};

/**
 * Gets the base HTML attributes for a form field.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {FieldName} fieldName - The name of the field.
 * @param {RefObject<HTMLElement>} formFieldRef - Reference to the form field element.
 * @param {HoneyFormFieldConfig<Form, FieldName, FormContext>} fieldConfig - Configuration options for the field.
 *
 * @returns {BaseHoneyFormFieldHTMLAttributes<any>} - The base HTML attributes for the form field.
 */
const getBaseFieldProps = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  fieldName: FieldName,
  formFieldRef: RefObject<HTMLElement>,
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext>,
): BaseHoneyFormFieldHTMLAttributes<any> => {
  return {
    ref: formFieldRef,
    type: FIELD_TYPE_MAP[fieldConfig.type],
    name: fieldName.toString(),
    // ARIA
    'aria-required': fieldConfig.required === true,
    'aria-invalid': false,
  };
};

const FIELD_TYPE_TO_INPUT_MODE_MAP: Partial<
  Record<HoneyFormFieldType, HTMLAttributes<HTMLInputElement>['inputMode']>
> = {
  email: 'email',
  number: 'numeric',
  numeric: 'numeric',
};

/**
 * Gets the appropriate input mode for a given form field based on its configuration.
 *
 * @remarks
 * This function is useful for setting the `inputMode` attribute of HTML input elements.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
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

type InteractiveFieldPropsOptions<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
> = {
  formFieldRef: RefObject<HTMLElement>;
  fieldConfig: HoneyFormInteractiveFieldConfig<Form, FieldName, FormContext>;
  setFieldValue: HoneyFormFieldSetValueInternal<Form>;
};

/**
 * Gets the interactive field properties for a form field.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - Type representing the value of the field.
 *
 * @param {FieldName} fieldName - The name of the field.
 * @param {FieldValue} fieldValue - The current value of the field.
 * @param {InteractiveFieldPropsOptions<Form, FieldName, FormContext>} options - Options for interactive field properties.
 *
 * @returns {HoneyFormInteractiveFieldProps} - The interactive field properties.
 */
const getInteractiveFieldProps = <
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
    value: fieldValue ? String(fieldValue) : '',
    inputMode: getInteractiveFieldInputMode(fieldConfig),
    onChange: e => {
      setFieldValue(fieldName, e.target.value, {
        isValidate: fieldConfig.mode === 'change',
        isFormat: !fieldConfig.formatOnBlur,
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

type PassiveFieldPropsOptions<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
> = {
  formFieldRef: RefObject<HTMLElement>;
  fieldConfig: HoneyFormPassiveFieldConfig<Form, FieldName, FormContext>;
  setFieldValue: HoneyFormFieldSetValueInternal<Form>;
};

/**
 * Gets the passive field properties for a form field.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {FieldName} fieldName - The name of the field.
 * @param {PassiveFieldPropsOptions<Form, FieldName, FormContext>} options - Options for passive field properties.
 *
 * @returns {HoneyFormPassiveFieldProps} - The passive field properties.
 */
const getPassiveFieldProps = <
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
        isFormat: false,
      });
    },
    // Additional field properties from field configuration
    ...fieldConfig.props,
  };
};

type ObjectFieldPropsOptions<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
> = {
  formFieldRef: RefObject<HTMLElement>;
  fieldConfig: HoneyFormObjectFieldConfig<Form, FieldName, FormContext>;
  setFieldValue: HoneyFormFieldSetValueInternal<Form>;
};

/**
 * Gets the object field properties for a form field.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - Type representing the value of the field.
 *
 * @param {FieldName} fieldName - The name of the field.
 * @param {FieldValue} fieldValue - The current value of the field.
 * @param {ObjectFieldPropsOptions<Form, FieldName, FormContext>} options - Options for object field properties.
 *
 * @returns {HoneyFormObjectFieldProps<Form, FieldName, FieldValue>} - The object field properties.
 */
const getObjectFieldProps = <
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
  }: ObjectFieldPropsOptions<Form, FieldName, FormContext>,
): HoneyFormObjectFieldProps<Form, FieldName, FieldValue> => {
  const baseFieldProps = getBaseFieldProps(fieldName, formFieldRef, fieldConfig);

  return {
    ...baseFieldProps,
    value: fieldValue,
    //
    onChange: newFieldValue => {
      setFieldValue(fieldName, newFieldValue, {
        isFormat: false,
      });
    },
    // Additional field properties from field configuration
    ...fieldConfig.props,
  };
};

type FieldPropsOptions<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
> = {
  formFieldRef: RefObject<HTMLElement>;
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext>;
  setFieldValue: HoneyFormFieldSetValueInternal<Form>;
};

/**
 * Retrieves the properties for a form field based on its type.
 *
 * This function determines the type of the form field (interactive, passive, or object)
 * and returns the appropriate properties for that field type. It ensures the form field
 * has the necessary configuration and handlers for proper functioning within the form.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - The type representing the value of the field.
 *
 * @param {FieldName} fieldName - The name of the form field.
 * @param {FieldValue} fieldValue - The current value of the form field.
 * @param {FieldPropsOptions<Form, FieldName, FormContext>} options - Additional options for retrieving field properties.
 *
 * @returns {HoneyFormFieldProps<Form, FieldName, FieldValue>} - The properties for the form field based on its type.
 */
const getFieldProps = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName],
>(
  fieldName: FieldName,
  fieldValue: FieldValue,
  { formFieldRef, fieldConfig, setFieldValue }: FieldPropsOptions<Form, FieldName, FormContext>,
): HoneyFormFieldProps<Form, FieldName, FieldValue> => {
  const isFieldInteractive = checkIfHoneyFormFieldIsInteractive(fieldConfig);
  if (isFieldInteractive) {
    return {
      passiveProps: undefined,
      objectProps: undefined,
      props: getInteractiveFieldProps(fieldName, fieldValue, {
        formFieldRef,
        fieldConfig,
        setFieldValue,
      }),
    };
  }

  const isFieldPassive = checkIfFieldIsPassive(fieldConfig);
  if (isFieldPassive) {
    return {
      props: undefined,
      objectProps: undefined,
      passiveProps: getPassiveFieldProps(fieldName, {
        formFieldRef,
        fieldConfig,
        setFieldValue,
      }),
    };
  }

  const isFieldObject = checkIfFieldIsObject(fieldConfig);
  if (isFieldObject) {
    return {
      props: undefined,
      passiveProps: undefined,
      objectProps: getObjectFieldProps(fieldName, fieldValue, {
        formFieldRef,
        fieldConfig,
        setFieldValue,
      }),
    };
  }

  return {
    props: undefined,
    passiveProps: undefined,
    objectProps: undefined,
  };
};

type CreateFieldOptions<Form extends HoneyFormBaseForm, FormContext> = {
  formContext: FormContext;
  formFieldsRef: HoneyFormFieldsRef<Form, FormContext>;
  formDefaultsRef: HoneyFormDefaultsRef<Form>;
  setFieldValue: HoneyFormFieldSetValueInternal<Form>;
  clearFieldErrors: HoneyFormFieldClearErrors<Form>;
  validateField: HoneyFormValidateField<Form>;
  pushFieldValue: HoneyFormFieldPushValue<Form>;
  removeFieldValue: HoneyFormFieldRemoveValue<Form>;
  addFormFieldErrors: HoneyFormFieldAddErrors<Form>;
};

/**
 * Creates a form field with the specified configuration and initial setup.
 *
 * This function initializes a form field by setting its configuration, default values,
 * event handlers, and other necessary properties. It ensures the form field is properly
 * integrated within the form context and maintains its state throughout the form's lifecycle.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {FieldName} fieldName - The name of the form field to be created.
 * @param {HoneyFormFieldConfig<Form, FieldName, FormContext>} fieldConfig - The configuration for the form field.
 * @param {CreateFieldOptions<Form, FormContext>} options - Additional options for field creation, including context and various handlers.
 *
 * @returns {HoneyFormField<Form, FieldName, FormContext>} - The created form field with all its properties and methods.
 */
export const createField = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  fieldName: FieldName,
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext>,
  {
    formContext,
    formFieldsRef,
    formDefaultsRef,
    setFieldValue,
    clearFieldErrors,
    validateField,
    pushFieldValue,
    removeFieldValue,
    addFormFieldErrors,
  }: CreateFieldOptions<Form, FormContext>,
): HoneyFormField<Form, FieldName, FormContext> => {
  const resultFieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext> = {
    required: false,
    ...(checkIfHoneyFormFieldIsInteractive(fieldConfig) && {
      // Set default config values
      mode: 'change',
      formatOnBlur: false,
      submitFormattedValue: false,
    }),
    ...fieldConfig,
  };

  // Set initial field value as the default value
  formDefaultsRef.current[fieldName] = resultFieldConfig.defaultValue;

  const isFieldInteractive = checkIfHoneyFormFieldIsInteractive(resultFieldConfig);

  const filteredValue =
    isFieldInteractive && resultFieldConfig.filter
      ? resultFieldConfig.filter(resultFieldConfig.defaultValue, { formContext })
      : resultFieldConfig.defaultValue;

  const resultValue =
    isFieldInteractive && resultFieldConfig.formatter
      ? resultFieldConfig.formatter(filteredValue, { formContext })
      : filteredValue;

  const fieldMeta: HoneyFormFieldMeta<Form, FieldName, FormContext> = {
    formFieldsRef,
    isValidationScheduled: false,
    childForms: undefined,
  };

  const formFieldRef = createRef<HTMLElement>();

  const fieldProps = getFieldProps(fieldName, resultValue, {
    formFieldRef,
    setFieldValue,
    fieldConfig: resultFieldConfig,
  });

  return {
    ...fieldProps,
    config: resultFieldConfig,
    errors: [],
    defaultValue: resultFieldConfig.defaultValue,
    rawValue: filteredValue,
    cleanValue: filteredValue,
    value: resultValue,
    isValidating: false,
    // TODO: try to fix the next error
    // @ts-expect-error
    getChildFormsValues: () => {
      return (
        fieldMeta.childForms?.map(childForm => {
          const childFormFields = childForm.formFieldsRef.current;
          if (!childFormFields) {
            throw new Error(HONEY_FORM_ERRORS.emptyFormFieldsRef);
          }

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
    resetValue: () => setFieldValue(fieldName, formDefaultsRef.current[fieldName]),
    addErrors: errors => addFormFieldErrors(fieldName, errors),
    addError: error => addFormFieldErrors(fieldName, [error]),
    clearErrors: () => clearFieldErrors(fieldName),
    validate: () => validateField(fieldName),
    focus: () => {
      if (!formFieldRef.current) {
        throw new Error(HONEY_FORM_ERRORS.emptyFormFieldsRef);
      }

      formFieldRef.current.focus();
    },
  };
};

/**
 * Returns the updated state of a form field with all errors cleared.
 *
 * This function processes the form field to reset its error-related properties,
 * ensuring that the field is marked as valid by setting the `aria-invalid` attribute to `false`
 * and clearing any existing error messages. It also resets the `cleanValue` property to `undefined`.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {HoneyFormField<Form, FieldName, FormContext>} formField - The current state of the form field to be updated.
 *
 * @returns {HoneyFormField<Form, FieldName, FormContext>} - The updated state of the form field with errors cleared and validation status reset.
 */
export const getNextErrorsFreeField = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  formField: HoneyFormField<Form, FieldName, FormContext>,
): HoneyFormField<Form, FieldName, FormContext> => {
  const isFieldInteractive = checkIfHoneyFormFieldIsInteractive(formField.config);
  const isFieldPassive = checkIfFieldIsPassive(formField.config);
  const isFieldObject = checkIfFieldIsObject(formField.config);

  const props = isFieldInteractive
    ? {
        ...formField.props,
        'aria-invalid': false,
      }
    : undefined;

  const passiveProps = isFieldPassive
    ? {
        ...formField.passiveProps,
        'aria-invalid': false,
      }
    : undefined;

  const objectProps = isFieldObject
    ? {
        ...formField.objectProps,
        'aria-invalid': false,
      }
    : undefined;

  return {
    ...formField,
    props,
    passiveProps,
    objectProps,
    cleanValue: undefined,
    errors: [],
  };
};

/**
 * Returns the next state of a form field with specified errors.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {HoneyFormField<Form, FieldName, FormContext>} formField - The current state of the form field.
 * @param {HoneyFormFieldError[]} fieldErrors - The errors to be set on the form field.
 *
 * @returns {HoneyFormField<Form, FieldName, FormContext>} - The next state with specified errors.
 */
export const getNextErredField = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  formField: HoneyFormField<Form, FieldName, FormContext>,
  fieldErrors: HoneyFormFieldError[],
): HoneyFormField<Form, FieldName, FormContext> => {
  const isFieldInteractive = checkIfHoneyFormFieldIsInteractive(formField.config);
  const isFieldPassive = checkIfFieldIsPassive(formField.config);
  const isFieldObject = checkIfFieldIsObject(formField.config);

  const isFieldErred = fieldErrors.length > 0;

  const props = isFieldInteractive
    ? {
        ...formField.props,
        'aria-invalid': isFieldErred,
      }
    : undefined;

  const passiveProps = isFieldPassive
    ? {
        ...formField.passiveProps,
        'aria-invalid': isFieldErred,
      }
    : undefined;

  const objectProps = isFieldObject
    ? {
        ...formField.objectProps,
        'aria-invalid': isFieldErred,
      }
    : undefined;

  return {
    ...formField,
    props,
    passiveProps,
    objectProps,
    errors: fieldErrors,
    // Set clean value as `undefined` if any error is present
    cleanValue: fieldErrors.length ? undefined : formField.cleanValue,
  };
};

/**
 * Retrieves the next state of a form field after resetting its values and clearing all field errors.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {HoneyFormField<Form, FieldName, FormContext>} formField - The form field to reset.
 * @param {boolean} [isResetToDefault=true] - Indicates whether the field should be reset to its default value.
 *
 * @returns {HoneyFormField<Form, FieldName, FormContext>} - The next state of the form field after resetting.
 */
export const getNextResetField = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  formField: HoneyFormField<Form, FieldName, FormContext>,
  isResetToDefault: boolean = true,
): HoneyFormField<Form, FieldName, FormContext> => {
  const isFieldInteractive = checkIfHoneyFormFieldIsInteractive(formField.config);
  const isFieldPassive = checkIfFieldIsPassive(formField.config);
  const isFieldObject = checkIfFieldIsObject(formField.config);

  const errorsFreeField = getNextErrorsFreeField(formField);

  const newFieldValue = isResetToDefault ? errorsFreeField.defaultValue : undefined;

  const props = isFieldInteractive
    ? {
        ...errorsFreeField.props,
        value: newFieldValue ? String(newFieldValue) : '',
      }
    : undefined;

  const passiveProps = isFieldPassive
    ? {
        ...errorsFreeField.passiveProps,
        ...(formField.config.type === 'checkbox' && {
          checked: errorsFreeField.defaultValue as boolean,
        }),
      }
    : undefined;

  const objectProps = isFieldObject
    ? {
        ...errorsFreeField.objectProps,
        value: newFieldValue,
      }
    : undefined;

  return {
    ...errorsFreeField,
    props,
    passiveProps,
    objectProps,
    value: newFieldValue,
    rawValue: newFieldValue,
    cleanValue: newFieldValue,
  };
};

/**
 * Handle the result of field validation and update the field errors array accordingly.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field being validated.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {HoneyFormFieldError[]} fieldErrors - The array to collect validation errors for the field.
 * @param {HoneyFormFieldConfig<Form, FieldName, FormContext>} fieldConfig - Configuration for the field being validated.
 * @param {Nullable<HoneyFormFieldValidationResult>} validationResult - The result of the field validation.
 */
const handleFieldValidationResult = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  fieldErrors: HoneyFormFieldError[],
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext>,
  validationResult: Nullable<HoneyFormFieldValidationResult>,
) => {
  if (validationResult) {
    if (Array.isArray(validationResult)) {
      fieldErrors.push(...validationResult);
    }
    // If the result is not a boolean, treat it as an invalid value and add it to fieldErrors
    else if (typeof validationResult !== 'boolean') {
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
      message: fieldConfig.errorMessages?.invalid ?? 'Invalid value',
    });
  }
};

/**
 * Updates the form field to indicate it is currently undergoing asynchronous validation.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {HoneyFormField<Form, FieldName, FormContext>} formField - The form field to update.
 *
 * @returns {HoneyFormField<Form, FieldName, FormContext>} - The updated form field with asynchronous validation status.
 */
const getNextAsyncValidatingField = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  formField: HoneyFormField<Form, FieldName, FormContext>,
): HoneyFormField<Form, FieldName, FormContext> => ({
  ...formField,
  isValidating: true,
  props: {
    ...formField.props,
    'aria-busy': true,
  },
});

/**
 * Updates the form field to indicate it has completed asynchronous validation.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {HoneyFormField<Form, FieldName, FormContext>} formField - The form field to update.
 *
 * @returns {HoneyFormField<Form, FieldName, FormContext>} - The updated form field with asynchronous validation completed.
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
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field being validated.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {HoneyFormFieldError[]} fieldErrors - The array of validation errors for the field.
 * @param {Nullable<HoneyFormFieldValidationResult>} validationResult - The result of the field validation.
 * @param {HoneyFormField<Form, FieldName, FormContext>} formField - The form field being validated.
 * @param {Form[FieldName] | undefined} cleanValue - The cleaned value of the field.
 *
 * @returns {HoneyFormField<Form, FieldName, FormContext>} - The next form field state after validation.
 */
const getNextValidatedField = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  fieldErrors: HoneyFormFieldError[],
  validationResult: Nullable<HoneyFormFieldValidationResult>,
  formField: HoneyFormField<Form, FieldName, FormContext>,
  cleanValue: Form[FieldName] | undefined,
): HoneyFormField<Form, FieldName, FormContext> => {
  handleFieldValidationResult(fieldErrors, formField.config, validationResult);

  if (fieldErrors.length) {
    return getNextErredField(formField, fieldErrors);
  }

  const errorsFreeField = getNextErrorsFreeField(formField);

  return {
    ...errorsFreeField,
    cleanValue,
  };
};

/**
 * Execute the validator associated with the type of specific form field.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field to validate.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - The type of the field's value.
 *
 * @param {FormContext} formContext - The type representing the context associated with the form.
 * @param {HoneyFormFields<Form, FormContext>} formFields - The current state of all form fields.
 * @param {HoneyFormField<Form, FieldName, FormContext>} formField - The current state of the form field.
 * @param {FieldValue | undefined} fieldValue - The current value of the form field.
 *
 * @returns {Nullable<HoneyFormFieldValidationResult>} - The result of the field type validation.
 */
const executeFieldTypeValidator = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName],
>(
  formContext: FormContext,
  formFields: HoneyFormFields<Form, FormContext>,
  formField: HoneyFormField<Form, FieldName, FormContext>,
  fieldValue: FieldValue | undefined,
): Nullable<HoneyFormFieldValidationResult> => {
  if (checkIfFieldIsObject(formField.config) || checkIfFieldIsNestedForms(formField.config)) {
    return null;
  }

  let validationResult: Nullable<
    HoneyFormFieldValidationResult | Promise<HoneyFormFieldValidationResult>
  > = null;

  const formValues = getFormValues(formFields);

  if (checkIfHoneyFormFieldIsInteractive(formField.config)) {
    // Get the validator function associated with the field type
    const validator = INTERACTIVE_FIELD_TYPE_VALIDATORS_MAP[formField.config.type];

    validationResult = validator(fieldValue, {
      formContext,
      formFields,
      formValues,
      fieldConfig: formField.config,
      signal: undefined,
      scheduleValidation: fieldName => scheduleFieldValidation(formFields[fieldName]),
    });
  } else if (checkIfFieldIsPassive(formField.config)) {
    const validator = PASSIVE_FIELD_TYPE_VALIDATORS_MAP[formField.config.type];

    validationResult = validator(fieldValue, {
      formContext,
      formFields,
      formValues,
      fieldConfig: formField.config,
      signal: undefined,
      scheduleValidation: fieldName => scheduleFieldValidation(formFields[fieldName]),
    });
  }

  // If the validation response is not a Promise, return it
  if (!(validationResult instanceof Promise)) {
    return validationResult;
  }

  // If the validation response is a Promise, return null
  return null;
};

type ExecuteInternalFieldValidatorsOptions<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = {
  fieldValue: FieldValue | undefined;
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext>;
  fieldErrors: HoneyFormFieldError[];
  formContext: FormContext;
  formFields: HoneyFormFields<Form, FormContext>;
  formValues: HoneyFormValues<Form>;
};

/**
 * Executes internal field validators for a given form field.
 *
 * @remarks
 * This function iterates over built-in field validators and executes them for the specified field.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 */
const executeInternalFieldValidators = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>({
  fieldValue,
  fieldConfig,
  fieldErrors,
  formContext,
  formFields,
  formValues,
}: ExecuteInternalFieldValidatorsOptions<Form, FieldName, FormContext>) => {
  BUILT_IN_FIELD_VALIDATORS.forEach(validator => {
    validator({
      fieldValue,
      fieldConfig,
      fieldErrors,
      formContext,
      formFields,
      formValues,
    });
  });

  if (checkIfHoneyFormFieldIsInteractive(fieldConfig)) {
    BUILT_IN_INTERACTIVE_FIELD_VALIDATORS.forEach(validator => {
      validator(fieldValue, fieldConfig, fieldErrors);
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
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {HoneyFormField<Form, FieldName, FormContext>} formField - The form field being validated.
 * @param {Promise<HoneyFormFieldValidationResult>} validationResponse - The promise representing the result of the validation.
 */
const handleFieldAsyncValidationResult = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  formField: HoneyFormField<Form, FieldName, FormContext>,
  validationResponse: Promise<HoneyFormFieldValidationResult>,
): Promise<void> =>
  validationResponse
    .then(validationResult => {
      if (validationResult) {
        if (Array.isArray(validationResult)) {
          formField.addErrors(validationResult);
          //
        } else if (typeof validationResult !== 'boolean') {
          formField.addError({
            type: 'invalid',
            message: validationResult,
          });
        }
      } else if (validationResult === false) {
        formField.addError({
          type: 'invalid',
          message: formField.config.errorMessages?.invalid ?? 'Invalid value',
        });
      }
    })
    .catch((validationResult: Error) => {
      if (validationResult.name === 'CanceledError') {
        // Throws from axios when HTTP request is aborted using signal (AbortController)
      } else {
        formField.addError({
          type: 'invalid',
          message: formField.config.errorMessages?.invalid ?? validationResult.message,
        });
      }
    });

/**
 * Sanitizes the value of a form field based on its type.
 * If a convertor for the provided field type exists in the default map, it uses it to convert the value.
 * If a convertor does not exist, it returns the original value.
 */
const sanitizeFieldValue = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FieldValue extends Form[FieldName],
>(
  fieldType: HoneyFormFieldType | undefined,
  fieldValue: FieldValue | undefined,
) => {
  const valueConvertor = fieldType
    ? (DEFAULT_FIELD_VALUE_CONVERTORS_MAP[fieldType] as HoneyFormFieldValueConvertor<FieldValue>)
    : null;

  return valueConvertor ? valueConvertor(fieldValue) : fieldValue;
};

/**
 * Updates the validation controller for a specific form field, ensuring that any
 * ongoing asynchronous validation is aborted before assigning a new controller.
 *
 * @template Form - The type representing the structure of the entire form.
 *
 * @param formFieldsValidationControllerRef - A reference to the validation controllers for each field in the form.
 * @param fieldName - The name of the field whose validation controller should be updated.
 *
 * @returns The newly created `AbortController` instance for the field.
 */
const updateFieldValidationController = <Form extends HoneyFormBaseForm>(
  formFieldsValidationControllerRef: MutableRefObject<HoneyFormValidationController<Form>>,
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
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field to validate in the form.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - The type representing the value of the field.
 */
type ExecuteFieldValidatorOptions<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName],
> = {
  /**
   * A reference to the validation controllers for each field in the form,
   * enabling management and cancellation of ongoing asynchronous validations.
   */
  formFieldsValidationControllerRef: MutableRefObject<HoneyFormValidationController<Form>>;
  /**
   * The contextual information for the form.
   */
  formContext: FormContext;
  /**
   * The current state of all form fields.
   */
  formFields: HoneyFormFields<Form, FormContext>;
  /**
   * The name of the field to validate.
   */
  fieldName: FieldName;
  /**
   * The value of the field.
   */
  fieldValue: FieldValue | undefined;
  /**
   * Optional callback function to complete asynchronous validation for the field.
   *
   * This function should be called once the asynchronous validation process is finished to indicate
   * that the field's validation status has been resolved.
   */
  finishFieldAsyncValidation?: HoneyFormFieldFinishAsyncValidation<Form, FieldName>;
};

/**
 * Executes the validator for a specific form field and returns the next state of the field.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field to validate.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - The value of the field.
 *
 * @param {ExecuteFieldValidatorOptions<Form, FieldName, FormContext, FieldValue>} options - Options for executing the field validator.
 *
 * @returns {HoneyFormField<Form, FieldName, FormContext>} - The next state of the validated field.
 */
export const executeFieldValidator = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName],
>({
  formFieldsValidationControllerRef,
  formContext,
  formFields,
  fieldName,
  fieldValue,
  finishFieldAsyncValidation,
}: ExecuteFieldValidatorOptions<Form, FieldName, FormContext, FieldValue>): HoneyFormField<
  Form,
  FieldName,
  FormContext
> => {
  let formField = formFields[fieldName];

  const fieldErrors: HoneyFormFieldError[] = [];

  const sanitizedValue = sanitizeFieldValue(formField.config.type, fieldValue);

  let validationResult = executeFieldTypeValidator(
    formContext,
    formFields,
    formField,
    sanitizedValue,
  );

  // Do not run additional validators if the default field type validator failed
  if (validationResult === null || validationResult === true) {
    const formValues = getFormValues(formFields);

    executeInternalFieldValidators({
      fieldValue: sanitizedValue,
      fieldConfig: formField.config,
      fieldErrors,
      formContext,
      formFields,
      formValues,
    });

    // Execute custom validator. Can only run when the default validator returns true
    if (formField.config.validator) {
      const fieldValidationController = updateFieldValidationController(
        formFieldsValidationControllerRef,
        fieldName,
      );

      const validationResponse = formField.config.validator(sanitizedValue, {
        formContext,
        formFields,
        formValues,
        // @ts-expect-error
        fieldConfig: formField.config,
        signal: fieldValidationController.signal,
        scheduleValidation: fieldName => scheduleFieldValidation(formFields[fieldName]),
      });

      if (isPromise(validationResponse)) {
        formField = getNextAsyncValidatingField(formField);

        handleFieldAsyncValidationResult(formField, validationResponse)
          .catch(noop)
          .finally(() => finishFieldAsyncValidation?.(fieldName));
      } else {
        validationResult = validationResponse;
      }
    }
  }

  return getNextValidatedField(fieldErrors, validationResult, formField, sanitizedValue);
};

/**
 * Options for executing the field validator asynchronously.
 *
 * @template ParentForm - The type representing the parent form structure.
 * @template ParentFieldName - The field name type for the parent form that will contain the array of child forms.
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field to validate.
 * @template FormContext - The type representing the context associated with the form.
 */
type ExecuteFieldValidatorAsyncOptions<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
> = {
  /**
   * A reference to the validation controllers for each field in the form,
   * enabling management and cancellation of ongoing asynchronous validations.
   */
  formFieldsValidationControllerRef: MutableRefObject<HoneyFormValidationController<Form>>;
  /**
   * The parent field of the current field, if any.
   */
  parentField: HoneyFormParentField<ParentForm, ParentFieldName> | undefined;
  /**
   * The name of the field to validate.
   */
  fieldName: FieldName;
  /**
   * The current state of all form fields.
   */
  formFields: HoneyFormFields<Form, FormContext>;
  /**
   * The type representing the context associated with the form.
   */
  formContext: FormContext;
};

/**
 * Asynchronously execute the validator for a specific form field.
 *
 * @template ParentForm - The type representing the parent form structure.
 * @template ParentFieldName - The field name type for the parent form that will contain the array of child forms.
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field to validate.
 * @template FormContext - The type representing the context associated with the form.
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
  formFieldsValidationControllerRef,
  parentField,
  fieldName,
  formFields,
  formContext,
}: ExecuteFieldValidatorAsyncOptions<
  ParentForm,
  ParentFieldName,
  Form,
  FieldName,
  FormContext
>): Promise<HoneyFormField<Form, FieldName, FormContext>> => {
  const formField = formFields[fieldName];

  const fieldErrors: HoneyFormFieldError[] = [];

  let filteredValue: Form[FieldName] = formField.rawValue;

  if (checkIfHoneyFormFieldIsInteractive(formField.config)) {
    filteredValue =
      typeof filteredValue === 'string'
        ? // Use trimStart() to do not allow typing from a space
          ((filteredValue as string).trimStart() as Form[FieldName])
        : filteredValue;

    if (formField.config.filter) {
      filteredValue = formField.config.filter(filteredValue, { formContext });
    } else {
      filteredValue = formField.rawValue;
    }
  } else if (checkIfFieldIsNestedForms(formField.config)) {
    filteredValue = formField.getChildFormsValues() as Form[FieldName];
  }

  const sanitizedValue = sanitizeFieldValue(formField.config.type, filteredValue);

  let validationResult = executeFieldTypeValidator(
    formContext,
    formFields,
    formField,
    sanitizedValue,
  );

  // Do not run additional validators if the default field type validator failed
  if (validationResult === null || validationResult === true) {
    const formValues = getFormValues(formFields);

    executeInternalFieldValidators({
      fieldValue: sanitizedValue,
      fieldConfig: formField.config,
      fieldErrors,
      formContext,
      formFields,
      formValues,
    });

    if (formField.config.validator) {
      const fieldValidationController = updateFieldValidationController(
        formFieldsValidationControllerRef,
        fieldName,
      );

      const validationResponse = formField.config.validator(sanitizedValue, {
        formContext,
        formFields,
        formValues,
        // @ts-expect-error
        fieldConfig: formField.config,
        signal: fieldValidationController.signal,
        scheduleValidation: fieldName => scheduleFieldValidation(formFields[fieldName]),
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

  return getNextValidatedField(fieldErrors, validationResult, formField, sanitizedValue);
};

/**
 * Options for processing the skippable fields.
 *
 * @template ParentForm - The type representing the parent form structure.
 * @template ParentFieldName - The field name type for the parent form that will contain the array of child forms.
 * @template Form - The type representing the structure of the entire form.
 * @template FormContext - The type representing the context associated with the form.
 */
type ProcessSkippableFieldsOptions<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FormContext,
> = {
  /**
   * The parent form field, if any.
   */
  parentField: HoneyFormParentField<ParentForm, ParentFieldName> | undefined;
  /**
   * The next state of the form fields.
   */
  nextFormFields: HoneyFormFields<Form, FormContext>;
  /**
   * The type representing the context associated with the form.
   */
  formContext: FormContext;
};

/**
 * Checks and clears errors for fields that should be skipped based on the current field's value.
 *
 * @template ParentForm - The type representing the parent form structure.
 * @template ParentFieldName - The field name type for the parent form that will contain the array of child forms.
 * @template Form - The type representing the structure of the entire form.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {ProcessSkippableFieldsOptions<ParentForm, Form, FormContext>} options - The options for processing skippable fields.
 */
export const processSkippableFields = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FormContext,
>({
  parentField,
  nextFormFields,
  formContext,
}: ProcessSkippableFieldsOptions<ParentForm, ParentFieldName, Form, FormContext>) => {
  const formValues = getFormValues(nextFormFields);

  forEachFormField(nextFormFields, otherFieldName => {
    const isSkipField = checkIsSkipField({
      parentField,
      formContext,
      formValues,
      fieldName: otherFieldName,
      formFields: nextFormFields,
    });

    if (isSkipField) {
      nextFormFields[otherFieldName] = getNextErrorsFreeField(nextFormFields[otherFieldName]);
    }
  });
};

/**
 * Reset all fields in the form, resetting their values to default value and removing errors.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {HoneyFormFields<Form, FormContext>} nextFormFields - The next form fields state.
 */
export const resetAllFields = <Form extends HoneyFormBaseForm, FormContext>(
  nextFormFields: HoneyFormFields<Form, FormContext>,
) => {
  forEachFormField(nextFormFields, fieldName => {
    nextFormFields[fieldName] = getNextResetField(nextFormFields[fieldName]);
  });
};

/**
 * Reset fields to default values that depend on the specified field,
 *  recursively resetting values to default value of nested dependencies.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field to validate.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {FormContext} formContext - The type representing the context associated with the form.
 * @param {HoneyFormFields<Form, FormContext>} formFields - The next form fields state.
 * @param {FieldName} fieldName - The name of the field triggering the resetting.
 * @param {Nullable<FieldName>} initiatorFieldName - The name of the field that initiated the resetting (optional).
 */
const resetDependentFields = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>(
  formContext: FormContext,
  formFields: HoneyFormFields<Form, FormContext>,
  fieldName: FieldName,
  initiatorFieldName: Nullable<FieldName> = null,
) => {
  initiatorFieldName = initiatorFieldName || fieldName;

  forEachFormField(formFields, otherFieldName => {
    if (otherFieldName === fieldName) {
      return;
    }

    const { dependsOn } = formFields[otherFieldName].config;

    let isDependent: boolean;

    if (Array.isArray(dependsOn)) {
      isDependent = dependsOn.includes(fieldName);
      //
    } else if (typeof dependsOn === 'function') {
      const formValues = getFormValues(formFields);

      isDependent = dependsOn(initiatorFieldName, formFields[otherFieldName].cleanValue, {
        formContext,
        formValues,
        formFields,
      });
    } else {
      isDependent = fieldName === dependsOn;
    }

    if (isDependent) {
      const otherField = formFields[otherFieldName];

      formFields[otherFieldName] = getNextResetField(otherField, false);

      if (otherFieldName !== initiatorFieldName) {
        resetDependentFields(formContext, formFields, otherFieldName, fieldName);
      }
    }
  });
};

/**
 * Options for triggering scheduled validations on form fields.
 *
 * @template ParentForm - The type representing the parent form structure.
 * @template ParentFieldName - The type representing the name of the parent field that contains an array of values.
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field in the form triggering validations.
 * @template FormContext - The type representing the context associated with the form.
 */
type TriggerScheduledFieldsValidationsOptions<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
> = {
  /**
   * A reference to the validation controllers for each field in the form,
   * enabling management and cancellation of ongoing asynchronous validations.
   */
  formFieldsValidationControllerRef: MutableRefObject<HoneyFormValidationController<Form>>;
  /**
   * The parent form field, if any.
   */
  parentField: HoneyFormParentField<ParentForm, ParentFieldName> | undefined;
  /**
   * The name of the field triggering validations.
   */
  fieldName: FieldName;
  /**
   * The next state of the form fields after a change.
   */
  nextFormFields: HoneyFormFields<Form, FormContext>;
  /**
   * The type representing the context associated with the form.
   */
  formContext: FormContext;
  /**
   * Callback function to complete asynchronous validation for the field.
   *
   * This function should be called once the asynchronous validation process is finished to indicate
   * that the field's validation status has been resolved.
   */
  finishFieldAsyncValidation: HoneyFormFieldFinishAsyncValidation<Form, FieldName>;
};

/**
 * Triggers validations for fields that have scheduled validations.
 *
 * @template ParentForm - The type representing the parent form structure.
 * @template ParentFieldName - The field name type for the parent form that will contain the array of child forms.
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field to trigger validations for.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {TriggerScheduledFieldsValidationsOptions<ParentForm, ParentFieldName, Form, FieldName, FormContext>} options - The options for triggering scheduled validations.
 */
const triggerScheduledFieldsValidations = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
>({
  formFieldsValidationControllerRef,
  parentField,
  fieldName,
  nextFormFields,
  formContext,
  finishFieldAsyncValidation,
}: TriggerScheduledFieldsValidationsOptions<
  ParentForm,
  ParentFieldName,
  Form,
  FieldName,
  FormContext
>) => {
  const formValues = getFormValues(nextFormFields);

  forEachFormField(nextFormFields, otherFieldName => {
    // Skip validations for the field triggering the change
    if (otherFieldName === fieldName) {
      return;
    }

    const nextFormField = nextFormFields[otherFieldName];

    // Check if validation is scheduled for the field
    if (nextFormField.__meta__.isValidationScheduled) {
      const isSkipField = checkIsSkipField({
        parentField,
        formContext,
        formValues,
        fieldName: otherFieldName,
        formFields: nextFormFields,
      });

      if (!isSkipField) {
        let filteredValue: Form[keyof Form];

        if (
          checkIfHoneyFormFieldIsInteractive(nextFormField.config) &&
          nextFormField.config.filter
        ) {
          filteredValue = nextFormField.config.filter(nextFormField.rawValue, { formContext });
          //
        } else if (checkIfFieldIsNestedForms(nextFormField.config)) {
          filteredValue = nextFormField.getChildFormsValues() as Form[keyof Form];
          //
        } else {
          filteredValue = nextFormField.rawValue;
        }

        nextFormFields[otherFieldName] = executeFieldValidator({
          formFieldsValidationControllerRef,
          formContext,
          finishFieldAsyncValidation,
          formFields: nextFormFields,
          fieldName: otherFieldName,
          fieldValue: filteredValue,
        });
      }

      // Reset the validation scheduled flag for the field
      nextFormFields[otherFieldName].__meta__.isValidationScheduled = false;
    }
  });
};

/**
 * Options for determining the next state of a single form field.
 *
 * @template FormContext - The type representing the context associated with the form.
 */
type NextSingleFieldStateOptions<FormContext> = {
  formContext: FormContext;
  isFormat: boolean;
};

/**
 * Gets the next state of a single form field based on the provided field value.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FieldValue - The value type of the form field.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {HoneyFormField<Form, FieldName, FormContext>} formField - The current state of the form field.
 * @param {FieldValue} fieldValue - The new value for the form field.
 * @param {NextSingleFieldStateOptions<FormContext>} options - Additional options for determining the next field state.
 *
 * @returns {HoneyFormField<Form, FieldName, FormContext>} - The next state of the form field.
 */
export const getNextSingleFieldState = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FieldValue extends Form[FieldName],
  FormContext,
>(
  formField: HoneyFormField<Form, FieldName, FormContext>,
  fieldValue: FieldValue,
  { formContext, isFormat }: NextSingleFieldStateOptions<FormContext>,
): HoneyFormField<Form, FieldName, FormContext> => {
  const isFieldInteractive = checkIfHoneyFormFieldIsInteractive(formField.config);
  const isFieldPassive = checkIfFieldIsPassive(formField.config);
  const isFieldObject = checkIfFieldIsObject(formField.config);

  const formattedValue =
    isFieldInteractive && isFormat && formField.config.formatter
      ? formField.config.formatter(fieldValue, { formContext })
      : fieldValue;

  const props = isFieldInteractive
    ? {
        ...formField.props,
        value: formattedValue ? String(formattedValue) : '',
      }
    : undefined;

  const passiveProps = isFieldPassive
    ? {
        ...formField.passiveProps,
        ...(formField.config.type === 'checkbox' && { checked: fieldValue as boolean }),
      }
    : undefined;

  const objectProps = isFieldObject
    ? {
        ...formField.objectProps,
        value: fieldValue,
      }
    : undefined;

  return {
    ...formField,
    props,
    passiveProps,
    objectProps,
    rawValue: fieldValue,
    value: formattedValue,
  };
};

/**
 * Options for determining the next state of form fields.
 *
 * @template ParentForm - The type representing the parent form structure.
 * @template ParentFieldName - The type representing the name of the parent field that contains an array of values.
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field in the form.
 * @template FormContext - The type representing the context associated with the form.
 */
type NextFieldsStateOptions<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
> = {
  /**
   * A reference to the validation controllers for each field in the form,
   * enabling management and cancellation of ongoing asynchronous validations.
   */
  formFieldsValidationControllerRef: MutableRefObject<HoneyFormValidationController<Form>>;
  /**
   * The parent form field, if any.
   */
  parentField: HoneyFormParentField<ParentForm, ParentFieldName> | undefined;
  /**
   * The type representing the context associated with the form.
   */
  formContext: FormContext;
  /**
   * The current state of all form fields.
   */
  formFields: HoneyFormFields<Form, FormContext>;
  /**
   * Flag indicating whether to validate the form fields.
   */
  isValidate: boolean;
  /**
   * Flag indicating whether to format the form fields.
   */
  isFormat: boolean;
  /**
   * Callback function to complete asynchronous validation for the field.
   *
   * This function should be called once the asynchronous validation process is finished to indicate
   * that the field's validation status has been resolved.
   */
  finishFieldAsyncValidation: HoneyFormFieldFinishAsyncValidation<Form, FieldName>;
};

/**
 * Computes the next state of form fields after a change in a specific field.
 *
 * @template ParentForm - The type representing the parent form structure.
 * @template ParentFieldName - The field name type for the parent form that will contain the array of child forms.
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field that changed.
 * @template FieldValue - The type of the field's value.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {FieldName} fieldName - The name of the field that changed.
 * @param {FieldValue | undefined} fieldValue - The new value of the changed field.
 * @param {NextFieldsStateOptions<ParentForm, ParentFieldName, Form, FieldName, FormContext>} options - Options for computing the next state.
 *
 * @returns {HoneyFormFields<Form, FormContext>} - The next state of form fields.
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
    formFieldsValidationControllerRef,
    parentField,
    formContext,
    formFields,
    isValidate,
    isFormat,
    finishFieldAsyncValidation,
  }: NextFieldsStateOptions<ParentForm, ParentFieldName, Form, FieldName, FormContext>,
): HoneyFormFields<Form, FormContext> => {
  const nextFormFields = { ...formFields };

  let nextFormField = nextFormFields[fieldName];
  let filteredValue: Form[FieldName] = fieldValue;

  if (checkIfHoneyFormFieldIsInteractive(nextFormField.config)) {
    filteredValue =
      typeof fieldValue === 'string'
        ? ((fieldValue as string).trimStart() as Form[FieldName])
        : fieldValue;

    if (nextFormField.config.filter) {
      // Apply additional filtering to the field value when the filter function is defined
      filteredValue = nextFormField.config.filter(filteredValue, { formContext });
    }
  }

  // If validation is requested, clear dependent fields and execute the field validator
  if (isValidate) {
    resetDependentFields(formContext, nextFormFields, fieldName);

    nextFormField = executeFieldValidator({
      formFieldsValidationControllerRef,
      formContext,
      fieldName,
      finishFieldAsyncValidation,
      formFields: nextFormFields,
      fieldValue: filteredValue,
    });
  } else {
    nextFormField = getNextErrorsFreeField(nextFormField);
  }

  nextFormFields[fieldName] = getNextSingleFieldState(nextFormField, filteredValue, {
    formContext,
    isFormat,
  });

  processSkippableFields({ parentField, nextFormFields, formContext });

  triggerScheduledFieldsValidations({
    formFieldsValidationControllerRef,
    parentField,
    fieldName,
    nextFormFields,
    formContext,
    finishFieldAsyncValidation,
  });

  return nextFormFields;
};
