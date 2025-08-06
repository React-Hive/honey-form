import type { RefObject, InputHTMLAttributes } from 'react';

import type { JSONValue, Nullable } from './generic.types';
import type {
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
  HoneyFormFieldSetValue,
  HoneyFormFieldSetValueInternal,
  HoneyFormFieldPushValue,
  HoneyFormValidateField,
  HoneyFormFieldProps,
} from './field.types';
import type {
  HoneyFormBaseChildForm,
  HoneyFormBaseForm,
  HoneyFormId,
  HoneyFormValues,
} from './common.types';
import type {
  KeysWithArrayValues,
  HoneyFormExtractChildForm,
  HoneyFormExtractChildForms,
} from './utility.types';

/**
 * Provides execution context for form-wide and field-specific operations.
 *
 * This interface grants access to the form's current state, field configurations,
 * and any additional contextual data, enabling validation, submission, rendering,
 * and other form-related logic.
 */
export interface HoneyFormBaseExecutionContext<Form extends HoneyFormBaseForm, FormContext> {
  /**
   * Additional contextual data associated with the form.
   * This may include metadata, external dependencies, or any extra information
   * required for validation, submission, or custom logic.
   */
  formContext: FormContext;
  /**
   * A collection of all form fields and their respective configurations.
   * This object provides access to field-level properties and behaviors.
   */
  formFields: HoneyFormFields<Form, FormContext>;
  /**
   * The current values of all fields in the form.
   * This represents the live state of the form at any given time.
   */
  formValues: HoneyFormValues<Form>;
}

/**
 * Represents the errors associated with each form field in a form.
 */
export type HoneyFormErrors<Form extends HoneyFormBaseForm> = {
  [FieldName in keyof Form]?: HoneyFormFieldError[];
};

/**
 * A mapping of form field names to their respective `AbortController` instances,
 * allowing control over the cancellation of asynchronous validation processes.
 */
export type HoneyFormFieldsValidationController<Form extends HoneyFormBaseForm> = {
  [FieldName in keyof Form]?: AbortController;
};

/**
 * Function type for handling changes to a specific form field.
 *
 * This type represents a handler function called when the value of a form field changes.
 * It receives the cleaned value of the field and a context object containing all form fields.
 *
 * @param cleanValue - The cleaned value of the field, or `undefined` if the value is not set.
 * @param context - The context object.
 *
 * @returns This function does not return a value.
 */
export type HoneyFormFieldOnChange<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = (
  cleanValue: FieldValue | undefined,
  executionContext: HoneyFormBaseExecutionContext<Form, FormContext>,
) => void;

/**
 * Provides contextual information to field validators, including access to form-wide data,
 * the specific field being validated, and additional form-level context.
 * This context allows validators to manage asynchronous validation, track cancellation signals,
 * and schedule validation for other fields when necessary.
 */
interface BaseFormFieldValidatorContext<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
> extends HoneyFormBaseExecutionContext<Form, FormContext> {
  /**
   * The `AbortSignal` associated with the field's validation process.
   * This signal can be used to handle cancellation of asynchronous validation tasks
   * when the field value changes or the form is reset.
   */
  signal: AbortSignal | undefined;
  /**
   * A function that allows scheduling validation for another field within the form.
   * This is useful when a field's validation depends on the value of another field,
   * ensuring that dependent validations are executed accordingly.
   */
  scheduleValidation: HoneyFormFieldScheduleValidation<Form, FieldName>;
}

/**
 * Context object for interactive field validators. This includes information about the form,
 * the specific field being validated, and the context of the form.
 */
export interface HoneyFormInteractiveFieldValidatorContext<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> extends BaseFormFieldValidatorContext<Form, FieldName, FormContext> {
  fieldConfig: HoneyFormInteractiveFieldConfig<Form, FieldName, FormContext, FieldValue>;
}

/**
 * A custom validation function for an interactive form field. It should return one of the following:
 * - `true` (indicating the value is valid).
 * - An error message (indicating the value is invalid).
 * - An array of `HoneyFormFieldError` objects (for multiple errors).
 * - A `Promise` that resolves to any of the above responses.
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
export interface HoneyFormPassiveFieldValidatorContext<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> extends BaseFormFieldValidatorContext<Form, FieldName, FormContext> {
  fieldConfig: HoneyFormPassiveFieldConfig<Form, FieldName, FormContext, FieldValue>;
}

/**
 * A custom validation function for a passive form field. It should return one of the following:
 * - `true` (indicating the value is valid).
 * - An error message (indicating the value is invalid).
 * - An array of `HoneyFormFieldError` objects (for multiple errors).
 * - A `Promise` that resolves to any of the above responses.
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
 */
export interface HoneyFormObjectFieldValidatorContext<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> extends BaseFormFieldValidatorContext<Form, FieldName, FormContext> {
  fieldConfig: HoneyFormObjectFieldConfig<Form, FieldName, FormContext, FieldValue>;
}

/**
 * Validator function for an object field.
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
 */
export interface HoneyFormNestedFormsFieldValidatorContext<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> extends BaseFormFieldValidatorContext<Form, FieldName, FormContext> {
  fieldConfig: HoneyFormNestedFormsFieldConfig<Form, FieldName, FormContext, FieldValue>;
}

/**
 * Validator function for a nested forms field within a larger form.
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
 * Function type representing a filter for form field values.
 *
 * @param value - The value to be filtered.
 * @param filterContext - The context object containing information relevant to the form.
 *
 * @returns The filtered value, possibly transformed based on the provided context.
 */
export type HoneyFormFieldFilter<
  Form extends HoneyFormBaseForm,
  FieldValue,
  FormContext = undefined,
> = (
  value: FieldValue | undefined,
  executionContext: HoneyFormBaseExecutionContext<Form, FormContext>,
) => FieldValue | undefined;

/**
 * Represents a formatter function for formatting the value of a form field.
 *
 * @param value - The current value of the form field.
 * @param formatterContext - The context object providing additional information for formatting.
 *
 * @returns The formatted value of the form field or undefined if no formatting is applied.
 */
export type HoneyFormFieldFormatter<
  Form extends HoneyFormBaseForm,
  FieldValue,
  FormContext = undefined,
> = (
  value: FieldValue | undefined,
  formatterContext: HoneyFormBaseExecutionContext<Form, FormContext>,
) => FieldValue | undefined;

/**
 * Function type for determining whether to skip a field based on the form's context.
 *
 * @param executionContext - The context object containing form context and form fields.
 *
 * @returns `true` if the field should be skipped, `false` otherwise.
 */
type HoneyFormSkipField<Form extends HoneyFormBaseForm, FormContext> = (
  executionContext: HoneyFormBaseExecutionContext<Form, FormContext>,
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

export type HoneyFormFieldRequiredValue = boolean | string;

/**
 * Specifies whether a form field is required.
 *
 * This type supports:
 * - A `boolean`: If `true`, the field is always required.
 * - A `string`: Treated as an error message to display when the field is required and left empty.
 * - A `function`: Dynamically determines whether the field is required, and optionally returns
 *   an error message.
 *
 * @param executionContext - The current context of the form, including form state,
 *                           other field values, and custom validation info.
 *
 * @returns `boolean` or `string` indicating whether the field is required and, optionally,
 *          a custom error message.
 */
type HoneyFormFieldRequired<Form extends HoneyFormBaseForm, FormContext> =
  | HoneyFormFieldRequiredValue
  | ((
      executionContext: HoneyFormBaseExecutionContext<Form, FormContext>,
    ) => HoneyFormFieldRequiredValue);

/**
 * A function type that defines a dependency relationship between form fields.
 *
 * This function determines whether the target field depends on the value of the initiator field.
 * It is used to dynamically control field behavior based on the state or value of another field.
 *
 * @param initiatorFieldName - The name of the field that triggers the dependency check.
 * @param value - The current value of the field being checked for dependency.
 * @param executionContext - Additional execution context,
 *  which may include form state, validation data, or other relevant information.
 *
 * @returns Returns `true` if the dependency condition is met, otherwise `false`.
 */
type HoneyFormFieldDependsOnFn<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> = (
  initiatorFieldName: keyof Form,
  value: FieldValue | undefined,
  executionContext: HoneyFormBaseExecutionContext<Form, FormContext>,
) => boolean;

/**
 * A type that defines the dependencies of a form field on other fields.
 *
 * This can either be:
 * - A single field name from the form.
 * - An array of field names.
 * - A custom function that checks for a dynamic relationship between fields, based on the current value and context.
 */
type HoneyFormFieldDependsOn<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
> = keyof Form | (keyof Form)[] | HoneyFormFieldDependsOnFn<Form, FieldName, FormContext>;

/**
 * Represents the base configuration for a form field.
 */
interface BaseFieldConfig<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext = undefined,
  FieldValue extends Form[FieldName] = Form[FieldName],
> {
  /**
   * Indicates whether the field is required.
   *
   * This property defines if the field must have a value.
   * - If `true`, the field is always required.
   * - If `string`, treated as an error message to display when the field is required.
   * - If `function`, it dynamically determines if the field is required
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
   * The debounced time in milliseconds for the `onChange` callback.
   * This sets a delay before the callback is invoked after a field value change.
   *
   * @default undefined
   */
  onChangeDebounce?: number;
}

/**
 * Defines the minimum allowable value for an interactive form field.
 *
 * This can either be a fixed number or a function that dynamically determines
 * the minimum value based on the form's execution context.
 */
type HoneyFormInteractiveFieldMin<Form extends HoneyFormBaseForm, FormContext> =
  | number
  | ((executionContext: HoneyFormBaseExecutionContext<Form, FormContext>) => number);

/**
 * Defines the maximum allowable value for an interactive form field.
 *
 * This can either be a fixed number or a function that dynamically determines
 * the maximum value based on the form's execution context.
 */
type HoneyFormInteractiveFieldMax<Form extends HoneyFormBaseForm, FormContext> =
  | number
  | ((executionContext: HoneyFormBaseExecutionContext<Form, FormContext>) => number);

/**
 * Represents the configuration for an interactive form field within the context of a specific form.
 */
export interface HoneyFormInteractiveFieldConfig<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> extends BaseFieldConfig<Form, FieldName, FormContext, FieldValue> {
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
   * Specifies the minimum allowable value or length for the field.
   *
   * - For `numeric` fields, this defines the minimum value allowed.
   * - For `string` fields, this represents the minimum required length.
   * - Can be a fixed number or a function that dynamically determines
   *  the minimum based on the form's execution context.
   *
   * @default undefined
   */
  min?: HoneyFormInteractiveFieldMin<Form, FormContext>;
  /**
   * Specifies the maximum allowable value or length for the field.
   *
   * - For `numeric` fields, this defines the maximum value allowed.
   * - For `string` fields, this represents the maximum permitted length.
   * - Can be a fixed number or a function that dynamically determines
   *  the maximum based on the form's execution context.
   *
   * @default undefined
   */
  max?: HoneyFormInteractiveFieldMax<Form, FormContext>;
  /**
   * Indicates if decimal values are allowed.
   *
   * @default false
   */
  decimal?: boolean;
  /**
   * Indicates if negative values for `number` field type are allowed.
   *
   * @default true
   */
  negative?: boolean;
  /**
   * The maximum number of decimal places allowed for `number` field type.
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
  filter?: HoneyFormFieldFilter<Form, FieldValue, FormContext>;
  /**
   * A function to modify the field's value.
   */
  formatter?: HoneyFormFieldFormatter<Form, FieldValue, FormContext>;
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
}

/**
 * Represents the configuration for a passive form field within the context of a specific form.
 */
export interface HoneyFormPassiveFieldConfig<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> extends BaseFieldConfig<Form, FieldName, FormContext, FieldValue> {
  /**
   * The type of the passive form field.
   */
  type: HoneyFormPassiveFieldType;
  /**
   * Custom validation function.
   */
  validator?: HoneyFormPassiveFieldValidator<Form, FieldName, FormContext, FieldValue>;
}

/**
 * Configuration for an object field within a larger form.
 */
export interface HoneyFormObjectFieldConfig<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> extends BaseFieldConfig<Form, FieldName, FormContext, FieldValue> {
  /**
   * Type identifier for the object field.
   */
  type: HoneyFormObjectFieldType;
  /**
   * Whether an empty array is considered a valid value for this object field.
   *
   * If `false`, an empty array will trigger a validation error when the field is required.
   *
   * @default false
   */
  allowEmptyArray?: boolean;
  /**
   * Whether the array is allowed to contain empty or nil values (e.g., `null`, `undefined`, or empty strings).
   *
   * This only applies when the field value is an array.
   *
   * @default false
   */
  allowEmptyArrayValues?: boolean;
  /**
   * Custom validator function for the object field.
   */
  validator?: HoneyFormObjectFieldValidator<Form, FieldName, FormContext, FieldValue>;
}

/**
 * Configuration for a nested forms field within a larger form.
 */
export interface HoneyFormNestedFormsFieldConfig<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName] = Form[FieldName],
> extends BaseFieldConfig<Form, FieldName, FormContext, FieldValue> {
  /**
   * Type identifier for the nested forms field.
   */
  type: HoneyFormNestedFormsFieldType;
  /**
   * Custom validator function for the nested forms field.
   */
  validator?: HoneyFormNestedFormsFieldValidator<Form, FieldName, FormContext, FieldValue>;
}

/**
 * Represents the configuration for a form field within the context of a specific form.
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

interface HoneyFormFieldBuiltInValidatorContext<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext = undefined,
  FieldValue extends Form[FieldName] = Form[FieldName],
> {
  executionContext: HoneyFormBaseExecutionContext<Form, FormContext>;
  fieldValue: FieldValue | undefined;
  fieldConfig: HoneyFormFieldConfig<Form, FieldName, FormContext, FieldValue>;
  fieldErrors: HoneyFormFieldError[];
}

/**
 * Represents a built-in form field validator function.
 */
export type HoneyFormFieldBuiltInValidator = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext = undefined,
>(
  validatorContext: HoneyFormFieldBuiltInValidatorContext<Form, FieldName, FormContext>,
) => void;

interface HoneyFormInteractiveFieldBuiltInValidatorContext<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext = undefined,
  FieldValue extends Form[FieldName] = Form[FieldName],
> {
  executionContext: HoneyFormBaseExecutionContext<Form, FormContext>;
  fieldValue: FieldValue | undefined;
  fieldConfig: HoneyFormInteractiveFieldConfig<Form, FieldName, FormContext, FieldValue>;
  fieldErrors: HoneyFormFieldError[];
}

/**
 * Represents a built-in form field validator function specifically for interactive form fields.
 */
export type HoneyFormInteractiveFieldBuiltInValidator = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext = undefined,
>(
  validatorContext: HoneyFormInteractiveFieldBuiltInValidatorContext<Form, FieldName, FormContext>,
) => void;

export type HoneyFormFieldValueConvertor<FieldValue> = (value: unknown) => FieldValue;

export type HoneyFormFieldsRef<Form extends HoneyFormBaseChildForm, FormContext> = RefObject<
  Nullable<HoneyFormFields<Form, FormContext>>
>;

/**
 * Contextual information for child forms within a parent form.
 */
export interface HoneyFormChildFormContext<
  ParentForm extends HoneyFormBaseForm,
  ChildForm extends HoneyFormBaseChildForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext,
> {
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
}

/**
 * Metadata associated with a form field.
 */
export interface HoneyFormFieldMeta<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  NestedFormsFieldName extends KeysWithArrayValues<Form> = KeysWithArrayValues<Form>,
> {
  /**
   * Reference to form fields.
   */
  formFieldsRef: HoneyFormFieldsRef<Form, FormContext>;
  /**
   * Indicates if field validation is scheduled.
   */
  validationScheduled: boolean;
  /**
   * An array of child form contexts when applicable.
   *
   * @default undefined
   */
  childForms: Form[NestedFormsFieldName] extends (infer ChildForm extends HoneyFormBaseChildForm)[]
    ? HoneyFormChildFormContext<Form, ChildForm, NestedFormsFieldName, undefined>[] | undefined
    : never;
}

/**
 * Represents the base structure and functionality of a form field.
 */
interface BaseHoneyFormField<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext = undefined,
  FieldValue extends Form[FieldName] = Form[FieldName],
> {
  /**
   * Configuration options for this field.
   */
  readonly config: HoneyFormFieldConfig<Form, FieldName, FormContext, FieldValue>;
  /**
   * The default value initially set for the field.
   *
   * @default undefined
   */
  readonly defaultValue: FieldValue | undefined;
  /**
   * The unprocessed value, before any filtering or formatting.
   */
  readonly rawValue: FieldValue | undefined;
  /**
   * The initial clean value of the field.
   *
   * @default undefined
   */
  readonly initialCleanValue: FieldValue | undefined;
  /**
   * The processed value after filtering and formatting. If there are errors, this is set as `undefined`.
   */
  readonly cleanValue: FieldValue | undefined;
  /**
   * The final, formatted value ready to be displayed to the user.
   */
  readonly value: FieldValue | undefined;
  /**
   * An array of errors associated with this field.
   *
   * @default []
   */
  readonly errors: HoneyFormFieldError[];
  /**
   * Indicates whether the value has changed from its initial value.
   *
   * @default false
   */
  readonly isDirty: boolean;
  /**
   * Indicates whether the field is currently undergoing validation.
   *
   * @default false
   */
  readonly isValidating: boolean;
  /**
   * A function to set the field's value.
   */
  readonly setValue: HoneyFormFieldSetValue<FieldValue>;
  /**
   * A function to remove a value from a parent field by its index.
   */
  readonly removeValue: (formIndex: number) => void;
  /**
   * Reset field value to default value and clear all errors.
   */
  readonly resetValue: () => void;
  /**
   * A function to add a new error to the field.
   */
  readonly addError: (error: HoneyFormFieldError) => void;
  /**
   * A function to add the new errors to the field.
   */
  readonly addErrors: (errors: HoneyFormFieldError[]) => void;
  /**
   * A function to clear all errors associated with this field.
   */
  readonly clearErrors: () => void;
  /**
   * A function to validate the field.
   */
  readonly validate: () => void;
  /**
   * Built-in metadata used by the library.
   */
  readonly __meta__: HoneyFormFieldMeta<Form, FieldName, FormContext>;
}

/**
 * Represents the state and functionality of a form field.
 */
export interface HoneyFormField<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext = undefined,
  FieldValue extends Form[FieldName] = Form[FieldName],
> extends BaseHoneyFormField<Form, FieldName, FormContext, FieldValue>,
    HoneyFormFieldProps<Form, FieldName, FieldValue> {
  /**
   * A function to add a new value to a parent field that can have child forms.
   */
  readonly pushValue: (value: HoneyFormExtractChildForm<FieldValue>) => void;
  /**
   * A function to retrieve child forms' values if the field is a parent field.
   */
  readonly getChildFormsValues: () => HoneyFormExtractChildForms<FieldValue>;
  /**
   * A function to focus on this field.
   *
   * @remarks
   * Can only be used when `props` are destructured within a component.
   */
  readonly focus: () => void;
}

/**
 * Represents the state and functionality of a parent field.
 */
export type HoneyFormParentField<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm> = KeysWithArrayValues<ParentForm>,
> = ParentFieldName extends undefined ? never : HoneyFormField<ParentForm, ParentFieldName>;

/**
 * Represents a collection of form fields.
 */
export type HoneyFormFields<Form extends HoneyFormBaseForm, FormContext = undefined> = {
  [FieldName in keyof Form]: HoneyFormField<Form, FieldName, FormContext>;
};

/**
 * Configuration object for all fields in a form.
 *
 * This type maps each field in the form to its respective configuration object,
 * allowing the form's behavior, validation, and other properties to be customized per field.
 */
export type HoneyFormFieldsConfig<Form extends HoneyFormBaseForm, FormContext = undefined> = {
  [FieldName in keyof Form]: HoneyFormFieldConfig<Form, FieldName, FormContext, Form[FieldName]>;
};

/**
 * Configuration for the fields of a child form within a parent form.
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
 */
export type HoneyFormDefaultValues<Form extends HoneyFormBaseForm> = Partial<Form>;

/**
 * A reference object for storing the default values of the form.
 */
export type HoneyFormDefaultsRef<Form extends HoneyFormBaseForm> = RefObject<
  HoneyFormDefaultValues<Form>
>;

/**
 * Represents the possible values for form defaults. It can either be an object containing default values
 * for the form fields or a function that returns a promise resolving to such an object.
 */
export type HoneyFormDefaults<Form extends HoneyFormBaseForm> =
  | HoneyFormDefaultValues<Form>
  | (() => Promise<HoneyFormDefaultValues<Form>>);

/**
 * Context object passed to the `onAfterValidate` callback function.
 *
 * This type defines the context that is provided to the `onAfterValidate` callback after the
 * form fields have been validated, allowing access to the validated form fields and context.
 */
interface HoneyFormAfterValidateContext<Form extends HoneyFormBaseForm, FormContext>
  extends HoneyFormBaseExecutionContext<Form, FormContext> {
  /**
   * A summary of validation errors for the entire form, organized by field.
   */
  formErrors: HoneyFormErrors<Form>;
  /**
   * A boolean value that becomes `true` when the form has any error.
   */
  isFormErred: boolean;
}

/**
 * The callback function triggered after the form fields are validated.
 *
 * This type represents a function called once the form validation is complete. It receives
 * the context object containing the validated form fields and form context. This callback can be used
 * to perform additional actions or processing after validation.
 *
 * @param validateContext - The context object containing the validated form fields and form context.
 *
 * @returns The Promise function does not return any value.
 *
 * @remarks
 * - This function is intended for post-validation actions, such as updating the UI or triggering
 *   additional logic that depends on the results of validation.
 * - It is called regardless of whether validation succeeds or fails.
 */
export type HoneyFormOnAfterValidate<Form extends HoneyFormBaseForm, FormContext = undefined> = (
  validateContext: HoneyFormAfterValidateContext<Form, FormContext>,
) => Promise<void>;

/**
 * Represents server-side validation errors for each field in the form.
 *
 * This type maps each field name to an array of error messages, which can be used to display
 * validation errors returned from the server. Each field can have multiple errors associated with it.
 */
export type HoneyFormServerErrors<Form extends HoneyFormBaseForm> = {
  [FieldName in keyof Form]: HoneyFormFieldErrorMessage[];
};

/**
 * Context object passed to the form submission handler.
 *
 * This type defines the context that is provided to the `onSubmit` callback function, allowing
 * access to additional contextual information relevant to the form submission.
 */
interface HoneyFormOnSubmitContext<FormContext> {
  /**
   * The contextual information for the form.
   */
  formContext: FormContext;
}

/**
 * Form submission callback function.
 *
 * It represents a function called when the form is submitted. It receives
 * the form data and context as arguments, and returns a promise that resolves to either
 * server validation errors or void (if the submission is successful without errors).
 *
 * @param data - The form data to be submitted. Contains all the field values of the form.
 * @param submitContext - The context object containing additional information for the submission.
 *
 * @returns A promise that resolves to:
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
 */
interface HoneyFormOnChangeContext<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FormContext,
> extends HoneyFormBaseExecutionContext<Form, FormContext> {
  /**
   * A reference to a parent form field.
   */
  parentField: HoneyFormParentField<ParentForm, ParentFieldName>;
  /**
   * An object that includes all field errors.
   * When a field has any error, the field appears in this object as a key, and the value is an array of field errors.
   *
   * @default {}
   */
  formErrors: HoneyFormErrors<Form>;
}

/**
 * Represents a callback function triggered when any form field value changes.
 *
 * @param cleanFormValues - The current clean form field values.
 * @param context - The context object providing additional information about the change, such as form field errors.
 */
export type HoneyFormOnChange<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FormContext,
> = (
  cleanFormValues: Form,
  context: HoneyFormOnChangeContext<ParentForm, ParentFieldName, Form, FormContext>,
) => void;

export interface InitialFormFieldsStateResolverOptions<
  Form extends HoneyFormBaseForm,
  FormContext,
> {
  formContext: FormContext;
  formFieldsRef: HoneyFormFieldsRef<Form, FormContext>;
  formDefaultsRef: HoneyFormDefaultsRef<Form>;
  setFieldValue: HoneyFormFieldSetValueInternal<Form>;
  clearFieldErrors: HoneyFormFieldClearErrors<Form>;
  validateField: HoneyFormValidateField<Form>;
  pushFieldValue: HoneyFormFieldPushValue<Form>;
  removeFieldValue: HoneyFormFieldRemoveValue<Form>;
  addFormFieldErrors: HoneyFormFieldAddErrors<Form>;
}

export interface FormOptions<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FormContext = undefined,
> {
  initialFormFieldsStateResolver: (
    options: InitialFormFieldsStateResolverOptions<Form, FormContext>,
  ) => HoneyFormFields<Form, FormContext>;
  /**
   * TODO: IMPLEMENT
   *
   * Determines how the validation process is triggered based on the specified mode.
   *
   * @default 'change'
   */
  mode?: HoneyFormFieldMode;
  /**
   * Configuration for the form fields.
   */
  fields: HoneyFormFieldsConfig<Form, FormContext>;
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
   * Has a priority over the default values specified in the `fields` configuration.
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
   * Specifies whether the form should perform validation for passed values.
   *
   * @default true
   */
  validateValues?: boolean;
  /**
   * If `true`, prevents updating form fields that have been marked as dirty.
   *
   * Use this to avoid overwriting user-modified fields during external values synchronization.
   *
   * @default false
   */
  skipSyncDirtyFields?: boolean;
  /**
   * Determines whether the form should be reset to its initial state after a successful submitting.
   * The form will be reset only when the `onSubmit` callback does not return any errors.
   *
   * @default false
   */
  resetAfterSubmit?: boolean;
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
   * A Promise callback function triggered after form validation is complete.
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
   * The debounced time in milliseconds for the `onChange` callback.
   * This sets a delay before the callback is invoked after any form field value change.
   *
   * @default undefined
   */
  onChangeDebounce?: number;
}

type BaseHoneyFormOptions<
  Form extends HoneyFormBaseForm,
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext = undefined,
> = Omit<
  FormOptions<ParentForm, ParentFieldName, Form, FormContext>,
  'initialFormFieldsStateResolver' | 'fields' | 'parentField'
>;

export interface HoneyFormOptions<Form extends HoneyFormBaseForm, FormContext = undefined>
  extends Omit<BaseHoneyFormOptions<Form, never, never, FormContext>, 'alwaysValidateParentField'> {
  /**
   * Configuration for the form fields.
   */
  fields?: HoneyFormFieldsConfig<Form, FormContext>;
}

/**
 * Options for configuring a child form within a parent form.
 */
export interface ChildHoneyFormOptions<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext = undefined,
  ChildForm extends HoneyFormExtractChildForm<
    ParentForm[ParentFieldName]
  > = HoneyFormExtractChildForm<ParentForm[ParentFieldName]>,
> extends Omit<
    BaseHoneyFormOptions<ChildForm, ParentForm, ParentFieldName, FormContext>,
    'name' | 'storage' | 'readDefaultsFromStorage'
  > {
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
}

interface MultiHoneyFormsOnSubmitContext<FormContext> {
  formContext: FormContext;
}

/**
 * Represents the options for configuring the multi forms.
 */
export interface MultiHoneyFormOptions<Form extends HoneyFormBaseForm, FormContext = undefined> {
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
   * @param data - An array containing the data from all forms.
   * @param submitContext - The contextual information for the submission process.
   *
   * @returns A Promise that resolves when the submission process is complete.
   */
  onSubmit?: (
    data: Form[],
    submitContext: MultiHoneyFormsOnSubmitContext<FormContext>,
  ) => Promise<void>;
}

/**
 * Options allowing customization of form values setting behavior.
 */
interface SetFormValuesOptions {
  /**
   * If `true`, the form will be validated after setting these values.
   *
   * @default true
   */
  validate?: boolean;
  /**
   * If `true`, only updates fields that have been modified (i.e., dirty) with new values.
   *
   * Useful for preserving user-edited values during form updates while syncing untouched fields.
   *
   * @default true
   */
  updateDirtyValues?: boolean;
  /**
   * Indicates whether setting a new form values should mark the form as "dirty".
   *
   * @default true
   */
  dirty?: boolean;
  /**
   * If `true`, clear all field values before setting new values.
   */
  clearAll?: boolean;
  /**
   * If `true`, skips the debounced `onChange` handling.
   *
   * @default false
   */
  skipOnChange?: boolean;
}

/**
 * Type representing a function to set values, allowing partial updates and options customization.
 */
export type HoneyFormSetFormValues<Form extends HoneyFormBaseForm> = (
  targetValues: Partial<Form>,
  options?: SetFormValuesOptions,
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
 */
interface HoneyFormValidateOptions<Form extends HoneyFormBaseForm> {
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
}

/**
 * Represents a function to validate a form.
 *
 * This function validates the fields of the form based on the provided options, such as
 * targeting specific fields or excluding others. The function returns a promise that resolves to `true`
 * if the form passes validation (i.e., no errors), or `false` if validation fails (i.e., errors are found).
 *
 * @param [options] - Optional validation options, allowing targeting or excluding specific fields.
 *
 * @returns A Promise that resolves to `true` if the form is valid, or `false` if validation errors are found.
 */
export type HoneyFormValidate<Form extends HoneyFormBaseForm> = (
  options?: HoneyFormValidateOptions<Form>,
) => Promise<boolean>;

/**
 * Represents a context object for the submit handler function.
 */
interface HoneyFormSubmitHandlerContext<FormContext> {
  /**
   * The contextual information for the form submission.
   */
  formContext: FormContext;
}

/**
 * Represents a function to handle form submission.
 *
 * @param data - The data of the form to be submitted.
 * @param context - The context object for the form submission.
 *
 * @returns A Promise that resolves to server errors if any, or `void` if submission succeeds.
 */
export type HoneyFormSubmitHandler<Form extends HoneyFormBaseForm, FormContext> = (
  data: Form,
  context: HoneyFormSubmitHandlerContext<FormContext>,
) => Promise<HoneyFormServerErrors<Form> | void>;

/**
 * Represents a function to submit a form.
 *
 * @param [submitHandler] - Optional submit handler function to handle form submission.
 *
 * @returns A Promise that resolves once the form submission is complete.
 */
export type HoneyFormSubmit<Form extends HoneyFormBaseForm, FormContext> = (
  submitHandler?: HoneyFormSubmitHandler<Form, FormContext>,
) => Promise<void>;

/**
 * Represents a function to reset a form.
 *
 * @param [newFormDefaults] - Optional new default values for the form fields.
 */
export type HoneyFormReset<Form extends HoneyFormBaseForm> = (
  newFormDefaults?: HoneyFormDefaultValues<Form>,
) => void;

/**
 * Restore unfinished form from the storage if detected.
 */
export type HoneyFormRestoreUnfinishedForm = () => void;

export interface HoneyFormState {
  isValidating: boolean;
  isSubmitting: boolean;
}
