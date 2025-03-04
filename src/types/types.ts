import type { MutableRefObject, RefObject, InputHTMLAttributes } from 'react';

import type { JSONValue, KeysWithArrayValues, Nullable } from './generic.types';
import type {
  HoneyFormFieldType,
  HoneyFormInteractiveFieldType,
  HoneyFormNestedFormsFieldType,
  HoneyFormObjectFieldType,
  HoneyFormPassiveFieldType,
  HoneyFormFieldErrorMessage,
  HoneyFormFieldErrorMessages,
  HoneyFormFieldMode,
  HoneyFormFieldError,
  HoneyFormFieldValidationResult,
  HoneyFormFieldClearErrors,
  HoneyFormFieldRemoveValue,
  HoneyFormFieldAddErrors,
  HoneyFormFieldScheduleValidation,
  HoneyFormFieldSetValueOptions,
  HoneyFormFieldSetValueInternal,
} from './field.types';
import type {
  ChildHoneyFormBaseForm,
  HoneyFormBaseForm,
  HoneyFormId,
  HoneyFormValues,
} from './common.types';
import type { HoneyFormExtractChildForm, HoneyFormExtractChildForms } from './utility.types';

/**
 * The base context object for any field-related function within the form, providing access to
 * form-wide information and field-specific properties.
 *
 * @template T - Additional properties that are specific to the field function.
 * @template Form - The type representing the structure of the entire form.
 * @template FormContext - The type representing any additional context associated with the form.
 */
type BaseHoneyFormFieldExecutionContext<T, Form extends HoneyFormBaseForm, FormContext> = {
  /**
   * Contextual data specific to the form, which can include meta-information or additional
   * data necessary for form validation, submission, or rendering.
   */
  formContext: FormContext;
  /**
   * An object containing all form fields and their properties.
   */
  formFields: HoneyFormFields<Form, FormContext>;
  /**
   * The current values of all form fields.
   */
  formValues: HoneyFormValues<Form>;
} & T;

/**
 * A type representing a function that completes the asynchronous validation for a specific form field.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form to complete the validation for.
 *
 * @param {FieldName} fieldName - The name of the field whose asynchronous validation is being completed.
 */
export type HoneyFormFieldFinishAsyncValidation<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form = keyof Form,
> = (fieldName: FieldName) => void;

/**
 * @template Form - The type representing the structure of the entire form.
 */
export type HoneyFormFieldPushValue<Form extends HoneyFormBaseForm> = <
  FieldName extends keyof { [F in keyof Form]: Form[F] extends unknown[] ? F : never },
  FieldValue extends Form[FieldName] = Form[FieldName],
>(
  fieldName: FieldName,
  value: HoneyFormExtractChildForm<FieldValue>,
) => void;

/**
 * Represents the errors associated with each form field in a form.
 *
 * @template Form - The type representing the structure of the entire form.
 */
export type HoneyFormErrors<Form extends HoneyFormBaseForm> = {
  [FieldName in keyof Form]?: HoneyFormFieldError[];
};

/**
 * Context object passed to the field change handler.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FormContext - The type representing the context associated with the form.
 */
type HoneyFormFieldOnChangeContext<Form extends HoneyFormBaseForm, FormContext> = {
  /**
   * The contextual information for the form.
   */
  formContext: FormContext;
  /**
   * The current state of all form fields.
   */
  formFields: HoneyFormFields<Form, FormContext>;
};

/**
 * Function type for handling changes to a specific form field.
 *
 * This type represents a handler function called when the value of a form field changes.
 * It receives the cleaned value of the field and a context object containing all form fields.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - The type of the value held by the specific field, defaulting to the form's field value type.
 *
 * @param {FieldValue | undefined} cleanValue - The cleaned value of the field, or `undefined` if the value is not set.
 * @param {HoneyFormFieldOnChangeContext<Form, FormContext>} context - The context object.
 *
 * @returns {void} - This function does not return a value.
 */
export type HoneyFormFieldOnChange<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = (
  cleanValue: FieldValue | undefined,
  context: HoneyFormFieldOnChangeContext<Form, FormContext>,
) => void;

/**
 * The base context object used within field validators, providing access to form-related information.
 * This context includes details about the entire form, the specific field being validated, and any
 * additional form-level context. It also allows scheduling validation for other fields.
 *
 * @template T - Additional properties that can be provided by specific field validators.
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field being validated within the form.
 * @template FormContext - The type representing the context associated with the form.
 */
type BaseHoneyFormFieldValidatorContext<
  T,
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
> = BaseHoneyFormFieldExecutionContext<
  {
    /**
     * Function to schedule validation for a different field within the form.
     * It allows the validator to trigger validation for fields other than the current one.
     */
    scheduleValidation: HoneyFormFieldScheduleValidation<Form, FieldName>;
  },
  Form,
  FormContext
> &
  T;

/**
 * Context object for interactive field validators. This includes information about the form,
 * the specific field being validated, and the context of the form.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field being validated.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - The type of the field value.
 */
export type HoneyFormInteractiveFieldValidatorContext<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = BaseHoneyFormFieldValidatorContext<
  {
    fieldConfig: HoneyFormInteractiveFieldConfig<Form, FieldName, FormContext, FieldValue>;
  },
  Form,
  FieldName,
  FormContext
>;

/**
 * A custom validation function for an interactive form field. It should return one of the following:
 * - `true` (indicating the value is valid).
 * - An error message (indicating the value is invalid).
 * - An array of `HoneyFormFieldError` objects (for multiple errors).
 * - A `Promise` that resolves to any of the above responses.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - Type representing the value of the field.
 *
 * @returns `true` if the value is valid, an error message if the value is invalid,
 *  an array of `HoneyFormFieldError` objects, or a `Promise` that resolves to any of these.
 */
export type HoneyFormInteractiveFieldValidator<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext = undefined,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = (
  /**
   * The current value of the field.
   */
  value: FieldValue | undefined,
  /**
   * The validation context, containing the field configuration and other form fields.
   */
  validatorContext: HoneyFormInteractiveFieldValidatorContext<
    Form,
    FieldName,
    FormContext,
    FieldValue
  >,
) => HoneyFormFieldValidationResult | Promise<HoneyFormFieldValidationResult>;

/**
 * Context object for passive field validators. This includes information about the form,
 * the specific field being validated, and the context of the form.
 */
export type HoneyFormPassiveFieldValidatorContext<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = BaseHoneyFormFieldValidatorContext<
  {
    fieldConfig: HoneyFormPassiveFieldConfig<Form, FieldName, FormContext, FieldValue>;
  },
  Form,
  FieldName,
  FormContext
>;

/**
 * A custom validation function for a passive form field. It should return one of the following:
 * - `true` (indicating the value is valid).
 * - An error message (indicating the value is invalid).
 * - An array of `HoneyFormFieldError` objects (for multiple errors).
 * - A `Promise` that resolves to any of the above responses.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - Type representing the value of the field.
 *
 * @returns `true` if the value is valid, an error message if the value is invalid,
 *  an array of `HoneyFormFieldError` objects, or a `Promise` that resolves to any of these.
 */
export type HoneyFormPassiveFieldValidator<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext = undefined,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = (
  /**
   * The current value of the object field.
   */
  value: FieldValue | undefined,
  /**
   * The validation context, containing the field configuration and other form fields.
   */
  validatorContext: HoneyFormPassiveFieldValidatorContext<Form, FieldName, FormContext, FieldValue>,
) => HoneyFormFieldValidationResult | Promise<HoneyFormFieldValidationResult>;

/**
 * Context object passed to the validator function for an object field.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - Type representing the value of the field.
 */
export type HoneyFormObjectFieldValidatorContext<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = BaseHoneyFormFieldValidatorContext<
  {
    fieldConfig: HoneyFormObjectFieldConfig<Form, FieldName, FormContext, FieldValue>;
  },
  Form,
  FieldName,
  FormContext
>;

/**
 * Validator function for an object field.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - Type representing the value of the field.
 */
export type HoneyFormObjectFieldValidator<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext = undefined,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = (
  /**
   * The current value of the object field.
   */
  value: FieldValue | undefined,
  /**
   * Context object containing information about the form and field.
   */
  validatorContext: HoneyFormObjectFieldValidatorContext<Form, FieldName, FormContext, FieldValue>,
) => HoneyFormFieldValidationResult | Promise<HoneyFormFieldValidationResult>;

/**
 * Context object passed to the validator function for a nested forms field.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - Type representing the value of the field.
 */
export type HoneyFormNestedFormsFieldValidatorContext<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = BaseHoneyFormFieldValidatorContext<
  {
    fieldConfig: HoneyFormNestedFormsFieldConfig<Form, FieldName, FormContext, FieldValue>;
  },
  Form,
  FieldName,
  FormContext
>;

/**
 * Validator function for a nested forms field within a larger form.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - Type representing the value of the field.
 *
 * @returns `true` if the value is valid, an error message if the value is invalid,
 *  an array of `HoneyFormFieldError` objects, or a `Promise` that resolves to any of these.
 */
export type HoneyFormNestedFormsFieldValidator<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = (
  /**
   * The current value of the field.
   */
  value: FieldValue | undefined,
  /**
   * The validation context, containing the field configuration and other form fields.
   */
  validatorContext: HoneyFormNestedFormsFieldValidatorContext<
    Form,
    FieldName,
    FormContext,
    FieldValue
  >,
) => HoneyFormFieldValidationResult | Promise<HoneyFormFieldValidationResult>;

/**
 * Context object for the filter function of a form field.
 *
 * @template FormContext - The type representing the context associated with the form.
 */
type HoneyFormFieldFilterContext<FormContext> = {
  /**
   * The contextual information for the form.
   */
  formContext: FormContext;
};

/**
 * Function type representing a filter for form field values.
 *
 * @template FieldValue - Type representing the value of the field.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param value - The value to be filtered.
 * @param filterContext - The context object containing information relevant to the form.
 *
 * @returns The filtered value, possibly transformed based on the provided context.
 */
export type HoneyFormFieldFilter<FieldValue, FormContext = undefined> = (
  value: FieldValue | undefined,
  filterContext: HoneyFormFieldFilterContext<FormContext>,
) => FieldValue | undefined;

/**
 * Contextual information provided to a form field formatter function.
 *
 * @template FormContext - The type representing the context associated with the form.
 */
type HoneyFormFieldFormatterContext<FormContext> = {
  /**
   * The contextual information for the form.
   */
  formContext: FormContext;
};

/**
 * Represents a formatter function for formatting the value of a form field.
 *
 * @template FieldValue - Type representing the value of the form field.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param value - The current value of the form field.
 * @param formatterContext - The context object providing additional information for formatting.
 *
 * @returns The formatted value of the form field or undefined if no formatting is applied.
 */
export type HoneyFormFieldFormatter<FieldValue, FormContext = undefined> = (
  value: FieldValue | undefined,
  formatterContext: HoneyFormFieldFormatterContext<FormContext>,
) => FieldValue | undefined;

/**
 * Function type for determining whether to skip a field based on the form's context.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param executionContext - The context object containing form context and form fields.
 *
 * @returns `true` if the field should be skipped, `false` otherwise.
 */
type HoneyFormSkipField<Form extends HoneyFormBaseForm, FormContext> = (
  executionContext: BaseHoneyFormFieldExecutionContext<unknown, Form, FormContext>,
) => boolean;

/**
 * Base input HTML attributes excluding 'value', 'onChange', 'aria-required', and 'aria-invalid'.
 *
 * @remarks
 * These properties are excluded as they are handled internally by the form library.
 */
type HoneyFormFieldConfigProps = Omit<
  InputHTMLAttributes<any>,
  'value' | 'onChange' | 'aria-required' | 'aria-invalid'
>;

/**
 * Defines whether a form field is required.
 *
 * This type can be:
 * - A `boolean`: If `true`, the field is always required.
 * - A `function`: Determines dynamically if the field is required based on the current value
 *   of the field and the execution context of the form.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {BaseHoneyFormFieldExecutionContext<unknown, Form, FormContext>} executionContext - Additional execution context,
 *   which may include form state, validation data, or other relevant information.
 *
 * @returns {boolean} - If `true`, the field is considered required; otherwise, `false`.
 */
type HoneyFormFieldRequired<Form extends HoneyFormBaseForm, FormContext> =
  | boolean
  | ((executionContext: BaseHoneyFormFieldExecutionContext<unknown, Form, FormContext>) => boolean);

/**
 * A function type that defines a dependency relationship between form fields.
 *
 * This function determines whether the target field depends on the value of the initiator field.
 * It is used to dynamically control field behavior based on the state or value of another field.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The specific field name for which the dependency is being defined.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - The value type of the field being depended upon, defaulting to the value type of FieldName.
 *
 * @param {keyof Form} initiatorFieldName - The name of the field that triggers the dependency check.
 * @param {FieldValue | undefined} value - The current value of the field being checked for dependency.
 * @param {BaseHoneyFormFieldExecutionContext<unknown, Form, FormContext>} executionContext - Additional execution context,
 *  which may include form state, validation data, or other relevant information.
 *
 * @returns {boolean} - Returns `true` if the dependency condition is met, otherwise `false`.
 */
type HoneyFormFieldDependsOnFn<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = (
  initiatorFieldName: keyof Form,
  value: FieldValue | undefined,
  executionContext: BaseHoneyFormFieldExecutionContext<unknown, Form, FormContext>,
) => boolean;

/**
 * A type that defines the dependencies of a form field on other fields.
 *
 * This can either be:
 * - A single field name from the form.
 * - An array of field names.
 * - A custom function that checks for a dynamic relationship between fields, based on the current value and context.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The specific field name for which dependencies are being defined.
 * @template FormContext - The type representing the context associated with the form.
 */
type HoneyFormFieldDependsOn<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
> = keyof Form | (keyof Form)[] | HoneyFormFieldDependsOnFn<Form, FieldName, FormContext>;

/**
 * Represents the base configuration for a form field.
 *
 * @template T - Additional properties specific to the field.
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - Type representing the value of the field.
 */
type BaseHoneyFormFieldConfig<
  T,
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext = undefined,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = Readonly<
  {
    /**
     * The type of the form field.
     */
    type: HoneyFormFieldType;
    /**
     * Indicates whether the field is required.
     *
     * This property defines if the field must have a value.
     * - If `true`, the field is always required.
     * - If a function, it dynamically determines if the field is required
     *   based on the field's value and the current form execution context.
     *
     * @default false
     */
    required?: HoneyFormFieldRequired<Form, FormContext>;
    /**
     * The default value for the field.
     *
     * Note:
     * The default value remains as undefined when the form defaults are provided as a Promise function.
     *
     * @default undefined
     */
    defaultValue?: FieldValue;
    /**
     * Clears the field value when the dependent field is changed.
     */
    dependsOn?: HoneyFormFieldDependsOn<Form, FieldName, FormContext>;
    /**
     * Custom error messages for this field.
     */
    errorMessages?: HoneyFormFieldErrorMessages;
    /**
     * Additional properties for configuring the field's HTML input element.
     *
     * @remarks
     * These properties can be used to customize the behavior of the HTML input element associated with the field.
     * This includes properties like field name, type, and any other valid HTML input attributes.
     */
    props?: HoneyFormFieldConfigProps;
    /**
     * A function to determine whether to skip validation and submission for this field.
     */
    skip?: HoneyFormSkipField<Form, FormContext>;
    /**
     * A function to serialize the field value into the appropriate JSON value.
     */
    serializer?: (fieldValue: FieldValue) => JSONValue;
    /**
     * A function to deserialize the raw value of the field from JSON into the appropriate form value.
     */
    deserializer?: (rawValue: JSONValue) => FieldValue;
    /**
     * Callback function triggered when the field value changes.
     */
    onChange?: HoneyFormFieldOnChange<Form, FieldName, FormContext, FieldValue>;
    /**
     * The debounce time in milliseconds for the `onChange` callback.
     * This sets a delay before the callback is invoked after a field value change.
     *
     * @default 0
     */
    onChangeDebounce?: number;
  } & T
>;

/**
 * Represents the configuration for an interactive form field within the context of a specific form.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - Type representing the value of the field.
 */
export type HoneyFormInteractiveFieldConfig<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = BaseHoneyFormFieldConfig<
  {
    /**
     * The type of the interactive form field.
     */
    type: HoneyFormInteractiveFieldType;
    /**
     * Determines how the validation process is triggered based on the specified mode.
     *
     * @default 'change'
     */
    mode?: HoneyFormFieldMode;
    /**
     * The minimum allowed value for numbers or minimum length for strings.
     *
     * @default undefined
     */
    min?: number;
    /**
     * The maximum allowed value for numbers or maximum length for strings.
     *
     * @default undefined
     */
    max?: number;
    /**
     * Indicates if decimal values are allowed.
     *
     * @default false
     */
    decimal?: boolean;
    /**
     * Indicates if negative values for number field type are allowed.
     *
     * @default true
     */
    negative?: boolean;
    /**
     * The maximum number of decimal places allowed for number field type.
     *
     * @default 2
     */
    maxFraction?: number;
    /**
     * Custom validation function.
     */
    validator?: HoneyFormInteractiveFieldValidator<Form, FieldName, FormContext, FieldValue>;
    /**
     * A function to filter characters from the value.
     */
    filter?: HoneyFormFieldFilter<FieldValue, FormContext>;
    /**
     * A function to modify the field's value.
     */
    formatter?: HoneyFormFieldFormatter<FieldValue, FormContext>;
    /**
     * A boolean flag indicating whether the formatter function should be applied to the field's value when the focus is removed from the input (on blur).
     *
     * When set to `true`, the formatter is applied `onBlur`, allowing users to see the formatted value after they have finished editing.
     * When set to `false` (or omitted), the formatter is applied as characters are typed.
     *
     * @example
     * - If `true`, the formatter will be applied when focus leaves the input.
     * - If `false` (or omitted), the formatter is applied with each typed character.
     *
     * @remarks
     * Use this option to control the timing of applying the formatter function.
     * Set to `true` to show a formatted value after the user has completed input.
     *
     * @default false
     */
    formatOnBlur?: boolean;
    /**
     * Set as `true` when formatted field value should be submitted instead of clean value.
     *
     * @default false
     */
    submitFormattedValue?: boolean;
  },
  Form,
  FieldName,
  FormContext,
  FieldValue
>;

/**
 * Represents the configuration for a passive form field within the context of a specific form.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - Type representing the value of the field.
 */
export type HoneyFormPassiveFieldConfig<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = BaseHoneyFormFieldConfig<
  {
    /**
     * The type of the passive form field.
     */
    type: HoneyFormPassiveFieldType;
    /**
     * Custom validation function.
     */
    validator?: HoneyFormPassiveFieldValidator<Form, FieldName, FormContext, FieldValue>;
  },
  Form,
  FieldName,
  FormContext,
  FieldValue
>;

/**
 * Configuration for an object field within a larger form.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - Type representing the value of the field.
 */
export type HoneyFormObjectFieldConfig<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = BaseHoneyFormFieldConfig<
  {
    /**
     * Type identifier for the object field.
     */
    type: HoneyFormObjectFieldType;
    /**
     * Custom validator function for the object field.
     */
    validator?: HoneyFormObjectFieldValidator<Form, FieldName, FormContext, FieldValue>;
  },
  Form,
  FieldName,
  FormContext,
  FieldValue
>;

/**
 * Configuration for a nested forms field within a larger form.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - Type representing the value of the field.
 */
export type HoneyFormNestedFormsFieldConfig<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = BaseHoneyFormFieldConfig<
  {
    /**
     * Type identifier for the nested forms field.
     */
    type: HoneyFormNestedFormsFieldType;
    /**
     * Custom validator function for the nested forms field.
     */
    validator?: HoneyFormNestedFormsFieldValidator<Form, FieldName, FormContext, FieldValue>;
  },
  Form,
  FieldName,
  FormContext,
  FieldValue
>;

/**
 * Represents the configuration for a form field within the context of a specific form.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - Type representing the value of the field.
 */
export type HoneyFormFieldConfig<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext = undefined,
  FieldValue extends Form[FieldName] = Form[FieldName],
> =
  | HoneyFormInteractiveFieldConfig<Form, FieldName, FormContext, FieldValue>
  | HoneyFormPassiveFieldConfig<Form, FieldName, FormContext, FieldValue>
  | HoneyFormObjectFieldConfig<Form, FieldName, FormContext, FieldValue>
  | HoneyFormNestedFormsFieldConfig<Form, FieldName, FormContext, FieldValue>;

/**
 * Represents the configuration for a child form field within the context of a specific parent form.
 *
 * @template ParentForm - The type representing the parent form structure.
 * @template ParentFieldName - The field name type for the parent form that will contain the array of child forms.
 * @template FieldName - Name of the field in the child form.
 * @template FormContext - The type representing the context associated with the form.
 * @template ChildForm - Type representing the child form.
 * @template FieldValue - Type representing the value of the field in the child form.
 */
export type ChildHoneyFormFieldConfig<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FieldName extends keyof ChildForm,
  FormContext,
  ChildForm extends HoneyFormExtractChildForm<
    ParentForm[ParentFieldName]
  > = HoneyFormExtractChildForm<ParentForm[ParentFieldName]>,
  FieldValue extends ChildForm[FieldName] = ChildForm[FieldName],
> =
  | HoneyFormInteractiveFieldConfig<ChildForm, FieldName, FormContext, FieldValue>
  | HoneyFormPassiveFieldConfig<ChildForm, FieldName, FormContext, FieldValue>
  | HoneyFormObjectFieldConfig<ChildForm, FieldName, FormContext, FieldValue>
  | HoneyFormNestedFormsFieldConfig<ChildForm, FieldName, FormContext, FieldValue>;

/**
 * Represents a built-in form field validator function.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FieldValue - Type representing the value of the field.
 */
export type HoneyFormFieldBuiltInValidator = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext = undefined,
  FieldValue extends Form[FieldName] = Form[FieldName],
>(context: {
  fieldValue: FieldValue | undefined;
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext, FieldValue>;
  fieldErrors: HoneyFormFieldError[];
  formContext: FormContext;
  formFields: HoneyFormFields<Form, FormContext>;
  formValues: HoneyFormValues<Form>;
}) => void;

/**
 * Represents a built-in form field validator function specifically for interactive form fields.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FieldValue - Type representing the value of the field.
 */
export type HoneyFormInteractiveFieldBuiltInValidator = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FieldValue extends Form[FieldName] = Form[FieldName],
>(
  fieldValue: FieldValue | undefined,
  fieldConfig: HoneyFormInteractiveFieldConfig<Form, FieldName, undefined, FieldValue>,
  fieldErrors: HoneyFormFieldError[],
) => void;

export type HoneyFormValidateField<Form extends HoneyFormBaseForm> = <FieldName extends keyof Form>(
  fieldName: FieldName,
) => void;

export type HoneyFormFieldValueConvertor<FieldValue> = (value: unknown) => FieldValue;

export type BaseHoneyFormFieldHTMLAttributes<T> = Omit<InputHTMLAttributes<T>, 'children'> & {
  ref: RefObject<T>;
};

/**
 * Represents the props for a form field component.
 * These props are typically used for input elements.
 *
 * @template BaseHoneyFormFieldHTMLAttributes - Base HTML attributes for a form field.
 */
export type HoneyFormInteractiveFieldProps = Readonly<
  Omit<BaseHoneyFormFieldHTMLAttributes<any>, 'value'> & {
    value: string | undefined;
  }
>;

/**
 * Represents the props for a passive form field, such as checkbox or radio.
 *
 * @remarks
 * These props include the base HTML attributes, checked state, and `onChange` handler.
 *
 * @template BaseHoneyFormFieldHTMLAttributes - Base HTML attributes for a form field.
 */
export type HoneyFormPassiveFieldProps = Readonly<BaseHoneyFormFieldHTMLAttributes<any>>;

/**
 * Represents the props for an object form field.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FieldValue - Type representing the value of the field.
 *
 * @remarks
 * These props include the base HTML attributes, a ref, the field value, and the `onChange` handler.
 */
export type HoneyFormObjectFieldProps<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = Readonly<
  Omit<BaseHoneyFormFieldHTMLAttributes<any>, 'value' | 'onChange'> & {
    value: FieldValue | undefined;
    onChange: (value: FieldValue | undefined) => void;
  }
>;

export type HoneyFormFieldsRef<Form extends ChildHoneyFormBaseForm, FormContext> = RefObject<
  Nullable<HoneyFormFields<Form, FormContext>>
>;

/**
 * Contextual information for child forms within a parent form.
 */
export type HoneyFormChildFormContext<
  ParentForm extends HoneyFormBaseForm,
  ChildForm extends ChildHoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext,
> = {
  /**
   * The unique identifier for the form.
   */
  formId: HoneyFormId;
  /**
   * A reference to the form fields of the child form.
   */
  formFieldsRef: HoneyFormFieldsRef<ChildForm, FormContext>;
  /**
   * Sets the values of the form fields.
   */
  setFormValues: HoneyFormSetFormValues<ChildForm>;
  /**
   * A function to submit the child form.
   */
  submitForm: HoneyFormSubmit<ChildForm, FormContext>;
  /**
   * A function to validate the child form.
   */
  validateForm: HoneyFormValidate<ChildForm>;
};

/**
 * Metadata associated with a form field.
 */
export type HoneyFormFieldMeta<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  NestedFormsFieldName extends KeysWithArrayValues<Form> = KeysWithArrayValues<Form>,
> = {
  /**
   * Reference to form fields.
   */
  formFieldsRef: HoneyFormFieldsRef<Form, FormContext>;
  /**
   * Indicates if field validation is scheduled.
   */
  isValidationScheduled: boolean;
  /**
   * An array of child form contexts when applicable.
   *
   * @default undefined
   */
  childForms: Form[NestedFormsFieldName] extends (infer ChildForm extends ChildHoneyFormBaseForm)[]
    ? HoneyFormChildFormContext<Form, ChildForm, NestedFormsFieldName, undefined>[] | undefined
    : never;
};

/**
 * Represents the base structure and functionality of a form field.
 *
 * @template T - Additional properties specific to the field.
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - Type representing the value of the field.
 */
type BaseHoneyFormField<
  T,
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext = undefined,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = Readonly<
  {
    /**
     * Configuration options for this field.
     */
    config: HoneyFormFieldConfig<Form, FieldName, FormContext, FieldValue>;
    /**
     * The default value initially set for the field.
     *
     * @default undefined
     */
    defaultValue: FieldValue | undefined;
    /**
     * The unprocessed value, before any filtering or formatting.
     */
    rawValue: FieldValue | undefined;
    /**
     * The processed value after filtering and formatting. If there are errors, this may be `undefined`.
     */
    cleanValue: FieldValue | undefined;
    /**
     * The final, formatted value ready to be displayed to the user.
     */
    value: FieldValue | undefined;
    /**
     * An array of errors associated with this field.
     *
     * @default []
     */
    errors: HoneyFormFieldError[];
    /**
     * Indicates whether the field is currently undergoing validation.
     *
     * @default false
     */
    isValidating: boolean;
    /**
     * A function to set the field's value.
     */
    setValue: (value: FieldValue, options?: HoneyFormFieldSetValueOptions) => void;
    /**
     * A function to remove a value from a parent field by its index.
     */
    removeValue: (formIndex: number) => void;
    /**
     * Reset field value to default value and clear all errors.
     */
    resetValue: () => void;
    /**
     * A function to add a new error to the field.
     */
    addError: (error: HoneyFormFieldError) => void;
    /**
     * A function to add the new errors to the field.
     */
    addErrors: (errors: HoneyFormFieldError[]) => void;
    /**
     * A function to clear all errors associated with this field.
     */
    clearErrors: () => void;
    /**
     * A function to validate the field.
     */
    validate: () => void;
    /**
     * Built-in metadata used by the library.
     */
    __meta__: HoneyFormFieldMeta<Form, FieldName, FormContext>;
  } & T
>;

/**
 * Represents the properties for a specific form field within a form.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FieldValue - The type representing the value of the field.
 */
export type HoneyFormFieldProps<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = {
  /**
   * An object with the necessary props to bind to the corresponding input element in the form.
   */
  props: HoneyFormInteractiveFieldProps | undefined;
  /**
   * Properties for non-interactive fields (e.g., checkbox, radio, file).
   */
  passiveProps: HoneyFormPassiveFieldProps | undefined;
  /**
   * An object containing the properties needed for object fields, which handle complex data structures.
   */
  objectProps: HoneyFormObjectFieldProps<Form, FieldName, FieldValue> | undefined;
};

/**
 * Represents the state and functionality of a form field.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FieldName - The name of the field within the form.
 * @template FormContext - The type representing the context associated with the form.
 * @template FieldValue - Type representing the value of the field.
 */
export type HoneyFormField<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext = undefined,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = BaseHoneyFormField<
  HoneyFormFieldProps<Form, FieldName, FieldValue> & {
    /**
     * A function to add a new value to a parent field that can have child forms.
     */
    pushValue: (value: HoneyFormExtractChildForm<FieldValue>) => void;
    /**
     * A function to retrieve child forms' values if the field is a parent field.
     */
    getChildFormsValues: () => HoneyFormExtractChildForms<FieldValue>;
    /**
     * A function to focus on this field.
     *
     * @remarks
     * Can only be used when `props` are destructured within a component.
     */
    focus: () => void;
  },
  Form,
  FieldName,
  FormContext,
  FieldValue
>;

/**
 * Represents the state and functionality of a parent field.
 *
 * @template ParentForm - The type representing the parent form structure.
 * @template ParentFieldName - Name of the parent field in the form with array values.
 */
export type HoneyFormParentField<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm> = KeysWithArrayValues<ParentForm>,
> = ParentFieldName extends undefined ? never : HoneyFormField<ParentForm, ParentFieldName>;

/**
 * Represents a collection of form fields.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FormContext - The type representing the context associated with the form.
 */
export type HoneyFormFields<Form extends HoneyFormBaseForm, FormContext = undefined> = {
  [FieldName in keyof Form]: HoneyFormField<Form, FieldName, FormContext>;
};

/**
 * Base form fields configuration.
 */
export type BaseHoneyFormFieldsConfig<Form extends HoneyFormBaseForm, FormContext = undefined> = {
  [FieldName in keyof Form]: BaseHoneyFormFieldConfig<
    unknown,
    Form,
    FieldName,
    FormContext,
    Form[FieldName]
  >;
};

/**
 * Configuration object for all fields in a form.
 *
 * This type maps each field in the form to its respective configuration object,
 * allowing the form's behavior, validation, and other properties to be customized per field.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FormContext - The type representing the context associated with the form.
 */
export type HoneyFormFieldsConfig<Form extends HoneyFormBaseForm, FormContext = undefined> = {
  [FieldName in keyof Form]: HoneyFormFieldConfig<Form, FieldName, FormContext, Form[FieldName]>;
};

/**
 * Configuration for the fields of a child form within a parent form.
 *
 * @template ParentForm - The type representing the parent form structure.
 * @template ParentFieldName - The field name type for the parent form that will contain the array of child forms.
 * @template FormContext - The type representing the context associated with the form.
 * @template ChildForm - The type representing the child form structure.
 */
export type ChildHoneyFormFieldsConfig<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext = undefined,
  ChildForm extends HoneyFormExtractChildForm<
    ParentForm[ParentFieldName]
  > = HoneyFormExtractChildForm<ParentForm[ParentFieldName]>,
> = {
  [FieldName in keyof ChildForm]: ChildHoneyFormFieldConfig<
    ParentForm,
    ParentFieldName,
    FieldName,
    FormContext,
    ChildForm,
    ChildForm[FieldName]
  >;
};

/**
 * Represents the default values for a form.
 *
 * @template Form - The type representing the structure of the entire form.
 */
export type HoneyFormDefaultValues<Form extends HoneyFormBaseForm> = Partial<Form>;

/**
 * A reference object for storing the default values of the form.
 *
 * @template Form - The type representing the structure of the entire form.
 */
export type HoneyFormDefaultsRef<Form extends HoneyFormBaseForm> = MutableRefObject<
  HoneyFormDefaultValues<Form>
>;

/**
 * Represents the possible values for form defaults. It can either be an object containing default values
 * for the form fields or a function that returns a promise resolving to such an object.
 *
 * @template Form - The type representing the structure of the entire form.
 */
export type HoneyFormDefaults<Form extends HoneyFormBaseForm> =
  | HoneyFormDefaultValues<Form>
  | (() => Promise<HoneyFormDefaultValues<Form>>);

/**
 * Context object passed to the `onAfterValidate` callback function.
 *
 * This type defines the context that is provided to the `onAfterValidate` callback after the
 * form fields have been validated, allowing access to the validated form fields and context.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FormContext - The type representing the context associated with the form.
 */
type HoneyFormAfterValidateContext<Form extends HoneyFormBaseForm, FormContext> = {
  /**
   * The form fields after validation, containing the current state of each field and any validation errors.
   */
  formFields: HoneyFormFields<Form, FormContext>;
  /**
   * A summary of validation errors for the entire form, organized by field.
   */
  formErrors: HoneyFormErrors<Form>;
  /**
   * The form context object containing additional information or settings related to the form.
   */
  formContext: FormContext;
  /**
   * A boolean value that becomes `true` when the form has any error.
   */
  isFormErred: boolean;
};

/**
 * The callback function triggered after the form fields are validated.
 *
 * This type represents a function called once the form validation is complete. It receives
 * the context object containing the validated form fields and form context. This callback can be used
 * to perform additional actions or processing after validation.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {HoneyFormAfterValidateContext<Form, FormContext>} validateContext - The context object containing
 * the validated form fields and form context.
 *
 * @returns {void} - The function does not return any value.
 *
 * @remarks
 * - This function is intended for post-validation actions, such as updating the UI or triggering
 *   additional logic that depends on the results of validation.
 * - It is called regardless of whether validation succeeds or fails.
 */
export type HoneyFormOnAfterValidate<Form extends HoneyFormBaseForm, FormContext = undefined> = (
  validateContext: HoneyFormAfterValidateContext<Form, FormContext>,
) => void;

/**
 * Represents server-side validation errors for each field in the form.
 *
 * This type maps each field name to an array of error messages, which can be used to display
 * validation errors returned from the server. Each field can have multiple errors associated with it.
 *
 * @template Form - The type representing the structure of the entire form.
 */
export type HoneyFormServerErrors<Form extends HoneyFormBaseForm> = {
  [FieldName in keyof Form]: HoneyFormFieldErrorMessage[];
};

/**
 * Context object passed to the form submission handler.
 *
 * This type defines the context that is provided to the `onSubmit` callback function, allowing
 * access to additional contextual information relevant to the form submission.
 *
 * @template FormContext - The type representing the context associated with the form.
 */
type HoneyFormOnSubmitContext<FormContext> = {
  /**
   * The contextual information for the form.
   */
  formContext: FormContext;
};

/**
 * Form submission callback function.
 *
 * It represents a function called when the form is submitted. It receives
 * the form data and context as arguments, and returns a promise that resolves to either
 * server validation errors or void (if the submission is successful without errors).
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {Form} data - The form data to be submitted. Contains all the field values of the form.
 * @param {HoneyFormOnSubmitContext<FormContext>} submitContext - The context object containing additional information for the submission.
 *
 * @returns {Promise<HoneyFormServerErrors<Form> | void>} - A promise that resolves to:
 * - `HoneyFormServerErrors<Form>` if there are server-side validation errors, or
 * - `void` if the submission is successful and no errors are encountered.
 *
 * @remarks
 * - The function is intended to handle the final form submission, including server-side validation and processing.
 * - The context parameter allows passing additional metadata or configuration that might be necessary for processing the submission.
 */
export type HoneyFormOnSubmit<Form extends HoneyFormBaseForm, FormContext = undefined> = (
  data: Form,
  submitContext: HoneyFormOnSubmitContext<FormContext>,
) => Promise<HoneyFormServerErrors<Form> | void>;

/**
 * The context object provided to the `HoneyFormOnChange` callback, containing detailed information
 * about form field changes and the current state of the form.
 *
 * @template ParentForm - The type representing the parent form structure.
 * @template ParentFieldName - The keys in the parent form that contain array values (used for fields like lists).
 * @template Form - The type representing the current form structure.
 * @template FormContext - The type representing additional context for the form fields.
 */
type HoneyFormOnChangeContext<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FormContext,
> = {
  /**
   * The contextual information for the form.
   */
  formContext: FormContext;
  /**
   * A reference to a parent form field.
   */
  parentField: HoneyFormParentField<ParentForm, ParentFieldName>;
  /**
   * An object that contains the state of the form fields.
   *
   * @default {}
   */
  formFields: HoneyFormFields<Form, FormContext>;
  /**
   * The current values of all form fields.
   */
  formValues: HoneyFormValues<Form>;
  /**
   * An object that includes all field errors.
   * When a field has any error, the field appears in this object as a key, and the value is an array of field errors.
   *
   * @default {}
   */
  formErrors: HoneyFormErrors<Form>;
};

/**
 * Represents a callback function triggered when any form field value changes.
 *
 * @param data - The current data of the form, including all form field values.
 * @param context - The context object providing additional information about the change, such as form field errors.
 */
export type HoneyFormOnChange<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FormContext,
> = (
  data: Form,
  context: HoneyFormOnChangeContext<ParentForm, ParentFieldName, Form, FormContext>,
) => void;

export type InitialFormFieldsStateResolverOptions<Form extends HoneyFormBaseForm, FormContext> = {
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

export type FormOptions<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FormContext = undefined,
> = {
  initialFormFieldsStateResolver: (
    options: InitialFormFieldsStateResolverOptions<Form, FormContext>,
  ) => HoneyFormFields<Form, FormContext>;
  /**
   * Configuration for the form fields.
   */
  fields: BaseHoneyFormFieldsConfig<Form, FormContext>;
  /**
   * The form name to use for saving and restoring not submitted form data.
   *
   * @default undefined
   */
  name?: string;
  /**
   * A reference to a parent form field.
   * Use this to create nested forms where the parent field can have child forms.
   */
  parentField?: HoneyFormParentField<ParentForm, ParentFieldName>;
  /**
   * Default values for the form fields.
   * Can be a Promise function to asynchronously retrieve defaults.
   *
   * @default {}
   */
  defaults?: HoneyFormDefaults<Form>;
  /**
   * Indicates whether to read default values from storage.
   *
   * @default false
   */
  readDefaultsFromStorage?: boolean;
  /**
   * External values that can be provided to the form to synchronize its values.
   * If provided, the form will stay in sync with these external values.
   *
   * @remarks
   * The callback `onChange` will not be called when using this form field values synchronization.
   *
   * @default undefined
   */
  values?: Partial<Form>;
  /**
   * Determines whether the form should be reset to its initial state after a successful submitting.
   * The form will be reset only when the `onSubmit` callback does not return any errors.
   *
   * @default false
   */
  resetAfterSubmit?: boolean;
  /**
   * Specifies whether the form should perform validation for external values.
   * If true, the form will validate the external values upon being set.
   * If false, the external values will be set without validation.
   *
   * @default false
   */
  validateExternalValues?: boolean;
  /**
   * Always run validation for the parent form field when any child field value is changed.
   *
   * This option ensures that changes in child form fields trigger validation in the
   * corresponding parent form field, maintaining overall form integrity.
   *
   * When set to `false`, the parent field will be validated only when a child field has errors
   * or when errors in a child field are cleared. This helps in notifying the parent form about
   * changes in the validation state of its child fields without performing redundant renders (validations).
   *
   * @default false
   */
  alwaysValidateParentField?: boolean;
  /**
   * Where to store the field values when they changed and restore the values from storage.
   *
   * @default undefined
   */
  storage?: 'qs' | 'ls';
  /**
   * Any object that can be used to pass contextual data to field functions.
   * This provides a way to share additional information or context with field-specific logic.
   *
   * @remarks
   * Context data should be wrapped in `useMemo` to prevent unnecessary recalculations.
   */
  context?: FormContext;
  /**
   * A callback function triggered after form validation is complete.
   * It can be used for additional actions or processing after validation.
   *
   * @remarks
   * The passed function should be wrapped in `useCallback` to prevent unnecessary re-renders.
   */
  onAfterValidate?: HoneyFormOnAfterValidate<Form, FormContext>;
  /**
   * A callback function triggered when the form is submitted.
   *
   * This function is responsible for handling form submission logic, API calls,
   * and any other actions needed when the user submits the form.
   *
   * @remarks
   * - Ensure that the `onSubmit` function resolves any asynchronous actions (e.g., API requests)
   *   before returning.
   * - Return any validation errors or failure messages as necessary.
   * - This function will not be triggered if the form has unresolved validation errors
   *   or if the form is not in a valid state.
   */
  onSubmit?: HoneyFormOnSubmit<Form, FormContext>;
  /**
   * A callback function triggered whenever the value of any form field changes.
   */
  onChange?: HoneyFormOnChange<ParentForm, ParentFieldName, Form, FormContext>;
  /**
   * The debounce time in milliseconds for the `onChange` callback.
   * This sets a delay before the callback is invoked after any form field value change.
   *
   * @default undefined
   */
  onChangeDebounce?: number;
};

type BaseHoneyFormOptions<
  T,
  Form extends HoneyFormBaseForm,
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext = undefined,
> = Omit<
  FormOptions<ParentForm, ParentFieldName, Form, FormContext>,
  'initialFormFieldsStateResolver' | 'fields' | 'parentField'
> &
  T;

export type HoneyFormOptions<Form extends HoneyFormBaseForm, FormContext = undefined> = Omit<
  BaseHoneyFormOptions<
    {
      /**
       * Configuration for the form fields.
       */
      fields?: HoneyFormFieldsConfig<Form, FormContext>;
    },
    Form,
    never,
    never,
    FormContext
  >,
  'alwaysValidateParentField'
>;

/**
 * Options for configuring a child form within a parent form.
 *
 * @template ParentForm - The type representing the parent form structure.
 * @template ParentFieldName - The field name type for the parent form that will contain the array of child forms.
 * @template FormContext - The type representing the context associated with the form.
 * @template ChildForm - The type representing the child form structure.
 */
export type ChildHoneyFormOptions<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext = undefined,
  ChildForm extends HoneyFormExtractChildForm<
    ParentForm[ParentFieldName]
  > = HoneyFormExtractChildForm<ParentForm[ParentFieldName]>,
> = Omit<
  BaseHoneyFormOptions<
    {
      /**
       * A reference to a parent form field.
       * Use this to create nested forms where the parent field can have child forms.
       */
      parentField: HoneyFormParentField<ParentForm, ParentFieldName>;
      /**
       * Configuration for the form fields.
       */
      fields?: ChildHoneyFormFieldsConfig<ParentForm, ParentFieldName, FormContext>;
      /**
       * The index of a child form within a parent form, if applicable.
       */
      formIndex?: number;
    },
    ChildForm,
    ParentForm,
    ParentFieldName,
    FormContext
  >,
  'name' | 'storage' | 'readDefaultsFromStorage'
>;

type MultiHoneyFormsOnSubmitContext<FormContext> = {
  formContext: FormContext;
};

/**
 * Represents the options for configuring the multi forms.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FormContext - The type representing the context associated with the form.
 */
export type MultiHoneyFormOptions<Form extends HoneyFormBaseForm, FormContext = undefined> = {
  /**
   * Any object that can be used to pass contextual data to forms.
   * This provides a way to share additional information or context with field-specific logic.
   *
   * @remarks
   * Context data should be wrapped in `useMemo` to prevent unnecessary recalculations.
   */
  context?: FormContext;
  /**
   * A callback function that will be invoked only when all forms have successfully passed validation.
   *
   * @param {Form[]} data - An array containing the data from all forms.
   * @param {MultiHoneyFormsOnSubmitContext<FormContext>} submitContext - The contextual information for the submission process.
   *
   * @returns {Promise<void>} - A Promise that resolves when the submission process is complete.
   */
  onSubmit?: (
    data: Form[],
    submitContext: MultiHoneyFormsOnSubmitContext<FormContext>,
  ) => Promise<void>;
};

/**
 * Options allowing customization of form values setting behavior.
 */
type UseHoneyFormSetFormValuesOptions = {
  /**
   * If `true`, the form will be validated after setting these values.
   *
   * @default true
   */
  isValidate?: boolean;
  /**
   * Indicates whether setting a new form values should mark the form as "dirty".
   *
   * @default true
   */
  isDirty?: boolean;
  /**
   * If `true`, clear all field values before setting new values.
   */
  isClearAll?: boolean;
  /**
   * If `true`, skips the debounced `onChange` handling.
   *
   * @default false
   */
  isSkipOnChange?: boolean;
};

/**
 * Type representing a function to set values, allowing partial updates and options customization.
 *
 * @template Form - The type representing the structure of the entire form.
 */
export type HoneyFormSetFormValues<Form extends HoneyFormBaseForm> = (
  values: Partial<Form>,
  options?: UseHoneyFormSetFormValuesOptions,
) => void;

export type HoneyFormSetFormErrors<Form extends HoneyFormBaseForm> = (
  formErrors: HoneyFormErrors<Form>,
) => void;

export type HoneyFormAddFormField<Form extends HoneyFormBaseForm, FormContext> = <
  FieldName extends keyof Form,
>(
  fieldName: FieldName,
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext, Form[FieldName]>,
) => void;

/**
 * Non-optional fields cannot be removed.
 */
export type HoneyFormRemoveFormField<Form extends HoneyFormBaseForm> = <
  FieldName extends keyof Form,
>(
  fieldName: FieldName,
) => void;

export type HoneyFormClearErrors = () => void;

/**
 * Options for validating specific form fields.
 *
 * These options allow you to either target specific fields for validation or exclude certain fields
 * from the validation process. This is useful for partial validation of large forms or when certain fields
 * should not be validated under specific conditions.
 *
 * @template Form - The type representing the structure of the entire form.
 */
type HoneyFormValidateOptions<Form extends HoneyFormBaseForm> = {
  /**
   * An optional array of field names to target for validation.
   * If specified, only the fields listed here will be validated.
   *
   * @remarks
   * If no target fields are provided, all form fields will be validated.
   *
   * @default undefined
   */
  targetFields?: (keyof Form)[];
  /**
   * An optional array of field names to exclude from validation.
   * If specified, these fields will be skipped during the validation process.
   *
   * @remarks
   * If no exclude fields are provided, no fields will be skipped during validation.
   *
   * @default undefined
   */
  excludeFields?: (keyof Form)[];
};

/**
 * Represents a function to validate a form.
 *
 * This function validates the fields of the form based on the provided options, such as
 * targeting specific fields or excluding others. The function returns a promise that resolves to `true`
 * if the form passes validation (i.e., no errors), or `false` if validation fails (i.e., errors are found).
 *
 * @template Form - The type representing the structure of the entire form.
 *
 * @param {HoneyFormValidateOptions<Form>} [options] - Optional validation options, allowing targeting or excluding specific fields.
 *
 * @returns {Promise<boolean>} - A Promise that resolves to `true` if the form is valid, or `false` if validation errors are found.
 */
export type HoneyFormValidate<Form extends HoneyFormBaseForm> = (
  options?: HoneyFormValidateOptions<Form>,
) => Promise<boolean>;

/**
 * Represents a context object for the submit handler function.
 *
 * @template FormContext - The type representing the context associated with the form.
 */
type HoneyFormSubmitHandlerContext<FormContext> = {
  /**
   * The contextual information for the form submission.
   */
  formContext: FormContext;
};

/**
 * Represents a function to handle form submission.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {Form} data - The data of the form to be submitted.
 * @param {HoneyFormSubmitHandlerContext<FormContext>} context - The context object for the form submission.
 *
 * @returns {Promise<HoneyFormServerErrors<Form> | void>} - A Promise that resolves to server errors if any, or `void` if submission succeeds.
 */
export type HoneyFormSubmitHandler<Form extends HoneyFormBaseForm, FormContext> = (
  data: Form,
  context: HoneyFormSubmitHandlerContext<FormContext>,
) => Promise<HoneyFormServerErrors<Form> | void>;

/**
 * Represents a function to submit a form.
 *
 * @template Form - The type representing the structure of the entire form.
 * @template FormContext - The type representing the context associated with the form.
 *
 * @param {HoneyFormSubmitHandler<Form, FormContext>} [submitHandler] - Optional submit handler function to handle form submission.
 *
 * @returns {Promise<void>} - A Promise that resolves once the form submission is complete.
 */
export type HoneyFormSubmit<Form extends HoneyFormBaseForm, FormContext> = (
  submitHandler?: HoneyFormSubmitHandler<Form, FormContext>,
) => Promise<void>;

/**
 * Represents a function to reset a form.
 *
 * @template Form - The type representing the structure of the entire form.
 *
 * @param {HoneyFormDefaultValues<Form>} [newFormDefaults] - Optional new default values for the form fields.
 */
export type HoneyFormReset<Form extends HoneyFormBaseForm> = (
  newFormDefaults?: HoneyFormDefaultValues<Form>,
) => void;

/**
 * Restore unfinished form from the storage if detected.
 */
export type HoneyFormRestoreUnfinishedForm = () => void;

export type HoneyFormState = {
  isValidating: boolean;
  isSubmitting: boolean;
};
