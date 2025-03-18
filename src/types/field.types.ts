import type { InputHTMLAttributes, ReactElement, RefObject } from 'react';

import type { HoneyFormBaseForm } from './common.types';
import type { JSONValue } from './generic.types';
import type { HoneyFormExtractChildForm } from './utility.types';

/**
 * Describes the types of interactive form fields that allow dynamic user input.
 * These fields typically capture input such as text, numbers, or email addresses.
 */
export type HoneyFormInteractiveFieldType = 'string' | 'numeric' | 'number' | 'email';

/**
 * Describes the types of passive form fields that are generally controlled by predefined options.
 * These fields usually represent boolean values or multiple-choice selections.
 */
export type HoneyFormPassiveFieldType = 'checkbox' | 'radio' | 'file';

/**
 * Describes a field type that can handle objects, enabling the form to manage structured data
 * such as nested objects or arrays of data.
 */
export type HoneyFormObjectFieldType = 'object';

/**
 * Describes a field type designed to handle arrays of forms, typically used for managing
 * dynamic, nested forms with repeatable structures.
 */
export type HoneyFormNestedFormsFieldType = 'nestedForms';

/**
 * Represents all possible form field types.
 */
export type HoneyFormFieldType =
  | HoneyFormInteractiveFieldType
  | HoneyFormPassiveFieldType
  | HoneyFormObjectFieldType
  | HoneyFormNestedFormsFieldType;

/**
 * Defines the possible modes for handling form field interactions and validations.
 *
 * - `change`: Triggers validation or updates whenever the field value changes (e.g., typing in an input).
 * - `blur`: Executes validation or processing only when the field loses focus.
 * - `submit`: Defers validation until the form is submitted, useful for reducing interruptions during user input.
 */
export type HoneyFormFieldMode = 'change' | 'blur' | 'submit';

/**
 * Enumerates the various error types that can occur within a form field.
 *
 * @remarks
 * - The 'server' error type refers to errors from the backend and does not prevent form submission.
 * - 'required', 'invalid', 'min', and 'max' errors are typically triggered by client-side validation.
 */
export type HoneyFormFieldErrorType = 'required' | 'invalid' | 'server' | 'min' | 'max' | 'minMax';

/**
 * Represents the structure of an error message for a form field.
 */
export type HoneyFormFieldErrorMessage = string | ReactElement;

/**
 * Defines a mapping of error types to their respective error messages.
 * This allows assigning custom error messages for each type of error encountered.
 */
export type HoneyFormFieldErrorMessages = Partial<
  Record<HoneyFormFieldErrorType, HoneyFormFieldErrorMessage>
>;

export interface HoneyFormFieldBaseHTMLAttributes<T>
  extends Omit<InputHTMLAttributes<T>, 'children'> {
  ref: RefObject<T>;
}

/**
 * Represents the props for a form field component.
 * These props are typically used for input elements.
 */
export interface HoneyFormInteractiveFieldProps
  extends Omit<HoneyFormFieldBaseHTMLAttributes<any>, 'value'> {
  value: string | undefined;
}

/**
 * Represents the props for a passive form field, such as checkbox or radio.
 *
 * @remarks
 * These props include the base HTML attributes, checked state, and `onChange` handler.
 */
export type HoneyFormPassiveFieldProps = Readonly<HoneyFormFieldBaseHTMLAttributes<any>>;

/**
 * Represents the props for an object form field.
 *
 * @remarks
 * These props include the base HTML attributes, a ref, the field value, and the `onChange` handler.
 */
export interface HoneyFormObjectFieldProps<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FieldValue extends Form[FieldName] = Form[FieldName],
> extends Omit<HoneyFormFieldBaseHTMLAttributes<any>, 'value' | 'onChange'> {
  value: FieldValue | undefined;
  onChange: (value: FieldValue | undefined) => void;
}

/**
 * Represents the properties for a specific form field within a form.
 */
export interface HoneyFormFieldProps<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FieldValue extends Form[FieldName] = Form[FieldName],
> {
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
}

/**
 * Represents an error for a specific form field.
 *
 * Each error includes a type, which categorizes the nature of the error,
 * and a message providing further details or context about the issue.
 */
export interface HoneyFormFieldError {
  /**
   * The type of the error (e.g., 'required', 'invalid').
   */
  type: HoneyFormFieldErrorType;
  /**
   * The detailed message associated with the error.
   */
  message: HoneyFormFieldErrorMessage;
}

/**
 * Represents the possible outcomes of a field validation process.
 *
 * A field validator can return various result types to indicate whether the field validation was successful or encountered errors:
 * - `true`: The field passed validation without issues.
 * - `HoneyFormFieldErrorMessage`: A custom error message, which could be a string or a React element for more advanced UI rendering.
 * - `HoneyFormFieldError[]`: An array of structured error objects, where each object includes an error type and a corresponding message,
 *   allowing for more detailed and comprehensive error handling, especially when multiple errors occur.
 */
export type HoneyFormFieldValidationResult =
  | boolean
  | HoneyFormFieldErrorMessage
  | HoneyFormFieldError[];

/**
 * A type representing a function that completes the asynchronous validation for a specific form field.
 *
 * @param fieldName - The name of the field whose asynchronous validation is being completed.
 */
export type HoneyFormFieldFinishAsyncValidation<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form = keyof Form,
> = (fieldName: FieldName) => void;

/**
 * Configuration options for setting a new value for a form field.
 */
interface HoneyFormFieldSetValueOptions {
  /**
   * Specifies whether setting a new value should mark the form as "dirty", indicating that
   * the user has modified the form.
   *
   * @default true
   */
  isDirty?: boolean;
  /**
   * Determines whether the new field value should be automatically formatted using
   * a predefined formatting function (if available).
   *
   * @default true
   */
  isFormat?: boolean;
  /**
   * Controls whether the validation function should be triggered after the new field value
   * is set. If `false`, validation will not occur unless there are existing field errors.
   *
   * @remarks
   * Even if this is set to `false`, validation will still be executed if any validation errors
   * exist for the field.
   *
   * @default true
   */
  isValidate?: boolean;
}

export type HoneyFormFieldSetValue<FieldValue> = (
  value: FieldValue,
  options?: HoneyFormFieldSetValueOptions,
) => void;

/**
 * Internal configuration options for setting a form field value.
 */
interface HoneyFormFieldSetValueOptionsInternal extends HoneyFormFieldSetValueOptions {
  /**
   * Indicates whether the values for nested child forms should be set when setting the value for a parent form field.
   *
   * If `true`, the corresponding values for child forms are also updated when the parent field value changes.
   * This is useful for fields representing nested forms or structures that contain child forms.
   *
   * If `false`, the child form values are not modified.
   *
   * @default true
   */
  isSetChildFormsValues?: boolean;
}

/**
 * A function type for setting a form field's value while updating the form's internal state.
 *
 * This function not only sets the value of a specified field but can also trigger validation, formatting,
 * and mark the form or field as "dirty" based on the provided options.
 *
 * @param fieldName - The name of the field whose value is being set.
 * @param value - The value to set for the specified field.
 * @param [options] - Configuration options to customize the behavior when setting the value,
 *  such as whether to trigger validation, mark the field as dirty, and format the value.
 */
export type HoneyFormFieldSetValueInternal<Form extends HoneyFormBaseForm> = <
  FieldName extends keyof Form,
  FieldValue extends Form[FieldName] = Form[FieldName],
>(
  fieldName: FieldName,
  value: FieldValue,
  options?: HoneyFormFieldSetValueOptionsInternal,
) => void;

export type HoneyFormFieldPushValue<Form extends HoneyFormBaseForm> = <
  FieldName extends keyof { [F in keyof Form]: Form[F] extends unknown[] ? F : never },
  FieldValue extends Form[FieldName] = Form[FieldName],
>(
  fieldName: FieldName,
  value: HoneyFormExtractChildForm<FieldValue>,
) => void;

export type HoneyFormValidateField<Form extends HoneyFormBaseForm> = <FieldName extends keyof Form>(
  fieldName: FieldName,
) => void;

/**
 * Represents a function that adds a validation error to a specific form field.
 *
 * @param fieldName - The name of the field to which the error should be associated.
 * @param error - The error object that contains the error type and corresponding message.
 */
export type HoneyFormFieldAddError<Form extends HoneyFormBaseForm> = <FieldName extends keyof Form>(
  fieldName: FieldName,
  error: HoneyFormFieldError,
) => void;

/**
 * Function type for adding multiple errors to a specific form field.
 *
 * This function is used to attach a list of validation errors to a particular field within the form.
 * It is useful in scenarios where a field can have multiple validation errors, allowing the application
 * to display or handle all errors associated with the field.
 *
 * @param fieldName - The name of the form field to which the errors will be added.
 * @param errors - An array of validation errors to be added to the specified form field.
 */
export type HoneyFormFieldAddErrors<Form extends HoneyFormBaseForm> = <
  FieldName extends keyof Form,
>(
  fieldName: FieldName,
  errors: HoneyFormFieldError[],
) => void;

/**
 * Represents a function that clears all validation errors for a specific form field.
 *
 * @param fieldName - The name of the field whose errors should be cleared.
 */
export type HoneyFormFieldClearErrors<Form extends HoneyFormBaseForm> = <
  FieldName extends keyof Form,
>(
  fieldName: FieldName,
) => void;

/**
 * A function type for removing an item from a form field that contains an array of values.
 *
 * This utility function allows for the manipulation of array-based form fields by removing the value
 * at a specific index within the array. It is particularly useful in cases where a field represents
 * a list or collection of inputs that the user can dynamically add to or remove from.
 *
 * @param fieldName - The name of the form field that contains an array of values.
 * @param formIndex - The index of the value to remove from the array.
 */
export type HoneyFormFieldRemoveValue<Form extends HoneyFormBaseForm> = <
  FieldName extends keyof { [F in keyof Form]: Form[F] extends unknown[] ? F : never },
>(
  fieldName: FieldName,
  formIndex: number,
) => void;

/**
 * A function type used to schedule validation for a different field in the form.
 * It triggers the validation process for the specified field, excluding the current one.
 *
 * @param fieldName - The name of the field (other than the current one) to validate.
 */
export type HoneyFormFieldScheduleValidation<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
> = (fieldName: Exclude<keyof Form, FieldName>) => void;

/**
 * Function type for serializing a form field's value into a JSON-compatible format.
 *
 * This function takes a form field's name and its value and returns a JSON-compatible representation
 * of that value. It is useful for preparing form data for storage or transmission.
 *
 * @param fieldName - The name of the field being serialized.
 * @param fieldValue - The value of the field to be serialized.
 *
 * @returns The serialized JSON-compatible value for the field.
 */
export type HoneyFormFieldSerializer<Form extends HoneyFormBaseForm> = <
  FieldName extends keyof Form,
>(
  fieldName: FieldName,
  fieldValue: Form[FieldName],
) => JSONValue;

/**
 * Function type for deserializing a field's raw JSON value into a form-compatible value.
 *
 * This function converts a raw value obtained from JSON into the appropriate form field value. It is
 * used to reconstruct the form state from stored or transmitted JSON data.
 *
 * @param fieldName - The name of the field for which the raw JSON value is being deserialized.
 * @param rawValue - The raw JSON value to be deserialized.
 *
 * @returns - The deserialized value suitable for the form field.
 */
export type HoneyFormFieldDeserializer<Form extends HoneyFormBaseForm> = <
  FieldName extends keyof Form,
>(
  fieldName: FieldName,
  rawValue: JSONValue,
) => Form[FieldName];
