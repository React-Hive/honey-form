import type {
  CustomDateRangeForm,
  HoneyFormInteractiveFieldBuiltInValidator,
  HoneyFormInteractiveFieldType,
  HoneyFormInteractiveFieldValidator,
  HoneyFormFieldBuiltInValidator,
  HoneyFormPassiveFieldType,
  HoneyFormPassiveFieldValidator,
  HoneyFormObjectFieldValidator,
} from './types';
import { isFunction, isNumber, isString, isNil, isBool } from './helpers';

export const INTERACTIVE_FIELD_TYPE_VALIDATORS_MAP: Record<
  HoneyFormInteractiveFieldType,
  HoneyFormInteractiveFieldValidator<any, any, any>
> = {
  string: () => true,
  numeric: (value: string | undefined, { fieldConfig: { errorMessages = {} } }) => {
    if (value === '' || value === undefined) {
      return true;
    }

    const isValidNumber = /^\d+$/.test(value);

    return (
      isValidNumber || [
        {
          type: 'invalid',
          message: errorMessages.invalid ?? 'Invalid format',
        },
      ]
    );
  },
  number: (
    value: string | undefined,
    { fieldConfig: { errorMessages = {}, decimal = false, negative = true, maxFraction = 2 } },
  ) => {
    if (value === '' || value === undefined) {
      return true;
    }

    const isValidNumber = new RegExp(
      `^${negative ? '-?' : ''}\\d+${decimal ? `(\\.\\d{1,${maxFraction}})?` : ''}$`,
    ).test(value.toString());

    return (
      isValidNumber || [
        {
          type: 'invalid',
          message:
            errorMessages.invalid ??
            `Only ${negative ? '' : 'positive '}${
              decimal ? `decimals with max fraction ${maxFraction}` : 'numerics'
            } are allowed`,
        },
      ]
    );
  },
  email: (value: string | undefined, { fieldConfig: { errorMessages = {} } }) => {
    if (value === '' || value === undefined) {
      return true;
    }

    const isValidEmail =
      /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
        value,
      );

    return (
      isValidEmail || [
        {
          type: 'invalid',
          message: errorMessages.invalid ?? 'Invalid email format',
        },
      ]
    );
  },
};

export const PASSIVE_FIELD_TYPE_VALIDATORS_MAP: Record<
  HoneyFormPassiveFieldType,
  HoneyFormPassiveFieldValidator<any, any, any>
> = {
  checkbox: () => true,
  radio: () => true,
  file: () => true,
};

/**
 * Built-in field validator for checking if a field is required.
 */
export const requiredBuiltInFieldValidator: HoneyFormFieldBuiltInValidator = ({
  executionContext,
  fieldValue,
  fieldConfig,
  fieldErrors,
}) => {
  if (!fieldConfig.required) {
    return;
  }

  const isEmpty =
    isNil(fieldValue) ||
    fieldValue === '' ||
    fieldValue === false ||
    (Array.isArray(fieldValue) && !fieldValue.length);

  if (!isEmpty) {
    return;
  }

  const { required, errorMessages } = fieldConfig;

  const requiredResult = isFunction(required) ? required(executionContext) : required;

  if (requiredResult) {
    const message = isString(required)
      ? required
      : isBool(requiredResult)
        ? (errorMessages?.required ?? 'The value is required')
        : requiredResult;

    fieldErrors.push({
      message,
      type: 'required',
    });
  }
};

/**
 * Built-in field validator for checking if a numeric field meets a minimum value requirement.
 */
export const minValueBuiltInFieldValidator: HoneyFormInteractiveFieldBuiltInValidator = ({
  executionContext,
  fieldValue,
  fieldConfig,
  fieldErrors,
}) => {
  if (
    fieldConfig.type !== 'number' ||
    fieldConfig.min === undefined ||
    fieldConfig.max !== undefined
  ) {
    return;
  }

  const minValue = isFunction(fieldConfig.min)
    ? fieldConfig.min(executionContext)
    : fieldConfig.min;

  if (
    fieldValue === undefined ||
    Number.isNaN(fieldValue) ||
    (isNumber(fieldValue) && fieldValue < minValue)
  ) {
    fieldErrors.push({
      type: 'min',
      message:
        fieldConfig.errorMessages?.min ?? `The value must be greater than or equal to ${minValue}`,
    });
  }
};

/**
 * Built-in field validator for checking if a numeric field meets a maximum value requirement.
 */
export const maxValueBuiltInFieldValidator: HoneyFormInteractiveFieldBuiltInValidator = ({
  executionContext,
  fieldValue,
  fieldConfig,
  fieldErrors,
}) => {
  if (
    fieldConfig.type !== 'number' ||
    fieldConfig.max === undefined ||
    fieldConfig.min !== undefined
  ) {
    return;
  }

  const maxValue = isFunction(fieldConfig.max)
    ? fieldConfig.max(executionContext)
    : fieldConfig.max;

  if (Number.isNaN(fieldValue) || (isNumber(fieldValue) && fieldValue > maxValue)) {
    fieldErrors.push({
      type: 'max',
      message:
        fieldConfig.errorMessages?.max ?? `The value must be less than or equal to ${maxValue}`,
    });
  }
};

/**
 * Validator for enforcing a numeric field value within a specified range.
 */
export const minMaxValueBuiltInFieldValidator: HoneyFormInteractiveFieldBuiltInValidator = ({
  executionContext,
  fieldValue,
  fieldConfig,
  fieldErrors,
}) => {
  if (
    fieldConfig.type !== 'number' ||
    fieldConfig.min === undefined ||
    fieldConfig.max === undefined
  ) {
    return;
  }

  const minValue = isFunction(fieldConfig.min)
    ? fieldConfig.min(executionContext)
    : fieldConfig.min;

  const maxValue = isFunction(fieldConfig.max)
    ? fieldConfig.max(executionContext)
    : fieldConfig.max;

  if (
    fieldValue === undefined ||
    Number.isNaN(fieldValue) ||
    (isNumber(fieldValue) && (fieldValue < minValue || fieldValue > maxValue))
  ) {
    fieldErrors.push({
      type: 'minMax',
      message:
        fieldConfig.errorMessages?.minMax ??
        `The value must be between ${minValue} and ${maxValue}`,
    });
  }
};

/**
 * Built-in field validator for checking if a string field meets minimum length requirements.
 */
export const minLengthBuiltInFieldValidator: HoneyFormInteractiveFieldBuiltInValidator = ({
  executionContext,
  fieldValue,
  fieldConfig,
  fieldErrors,
}) => {
  if (
    (fieldConfig.type !== 'string' &&
      fieldConfig.type !== 'email' &&
      fieldConfig.type !== 'numeric') ||
    fieldConfig.min === undefined ||
    fieldConfig.max !== undefined ||
    !isString(fieldValue) ||
    !fieldValue
  ) {
    return;
  }

  const minLength = isFunction(fieldConfig.min)
    ? fieldConfig.min(executionContext)
    : fieldConfig.min;

  if (fieldValue.length < minLength) {
    fieldErrors.push({
      type: 'min',
      message:
        fieldConfig.errorMessages?.min ??
        `The length must be greater than or equal to ${minLength} characters`,
    });
  }
};

/**
 * Built-in field validator for checking if a string field meets maximum length requirements.
 */
export const maxLengthBuiltInFieldValidator: HoneyFormInteractiveFieldBuiltInValidator = ({
  executionContext,
  fieldValue,
  fieldConfig,
  fieldErrors,
}) => {
  if (
    (fieldConfig.type !== 'string' &&
      fieldConfig.type !== 'email' &&
      fieldConfig.type !== 'numeric') ||
    fieldConfig.max === undefined ||
    fieldConfig.min !== undefined ||
    !isString(fieldValue) ||
    !fieldValue
  ) {
    return;
  }

  const maxLength = isFunction(fieldConfig.max)
    ? fieldConfig.max(executionContext)
    : fieldConfig.max;

  if (fieldValue.length > maxLength) {
    fieldErrors.push({
      type: 'max',
      message:
        fieldConfig.errorMessages?.max ??
        `The length must be less than or equal to ${maxLength} characters`,
    });
  }
};

/**
 * Built-in field validator for checking if a string field meets minimum and maximum length requirements.
 */
export const minMaxLengthBuiltInFieldValidator: HoneyFormInteractiveFieldBuiltInValidator = ({
  executionContext,
  fieldValue,
  fieldConfig,
  fieldErrors,
}) => {
  if (
    (fieldConfig.type !== 'string' &&
      fieldConfig.type !== 'email' &&
      fieldConfig.type !== 'numeric') ||
    fieldConfig.min === undefined ||
    fieldConfig.max === undefined ||
    !isString(fieldValue) ||
    !fieldValue
  ) {
    return;
  }

  const minLength = isFunction(fieldConfig.min)
    ? fieldConfig.min(executionContext)
    : fieldConfig.min;

  const maxLength = isFunction(fieldConfig.max)
    ? fieldConfig.max(executionContext)
    : fieldConfig.max;

  if (fieldValue.length < minLength || fieldValue.length > maxLength) {
    if (minLength === maxLength) {
      fieldErrors.push({
        type: 'minMax',
        message:
          fieldConfig.errorMessages?.minMax ?? `The length must be exactly ${minLength} characters`,
      });
      //
      return;
    }

    fieldErrors.push({
      type: 'minMax',
      message:
        fieldConfig.errorMessages?.minMax ??
        `The length must be between ${minLength} and ${maxLength} characters`,
    });
  }
};

//
// Data Range Validators
//

type DatePropertyKey<Form> = string & keyof Form;

interface CreateHoneyFormDateFromValidatorOptions<
  Form extends CustomDateRangeForm<DateFromKey, DateToKey>,
  DateFromKey extends DatePropertyKey<Form>,
  DateToKey extends Exclude<DatePropertyKey<Form>, DateFromKey>,
> {
  dateToKey: DateToKey;
  minDate?: Date;
  maxDate?: Date;
  errorMsg?: string;
  ignoreTime?: boolean;
  inclusiveRange?: boolean;
}

/**
 * Creates a validator function to ensure the validity of a "Date From" field within the context of a date range.
 *
 * @param options - Options for creating the validator.
 *
 * @returns The validator function for "Date From" field.
 */
export const createHoneyFormDateFromValidator =
  <
    Form extends CustomDateRangeForm<DateFromKey, DateToKey>,
    FormContext = undefined,
    DateFromKey extends DatePropertyKey<Form> = DatePropertyKey<Form>,
    DateToKey extends Exclude<DatePropertyKey<Form>, DateFromKey> = Exclude<
      DatePropertyKey<Form>,
      DateFromKey
    >,
  >({
    dateToKey,
    minDate,
    maxDate,
    errorMsg = '"Date From" should be equal or less than "Date To"',
    ignoreTime = true,
    inclusiveRange = true,
  }: CreateHoneyFormDateFromValidatorOptions<
    Form,
    DateFromKey,
    DateToKey
  >): HoneyFormObjectFieldValidator<Form, DateFromKey, FormContext> =>
  /**
   * Validator function for "Date From" field.
   *
   * @param dateFrom - The value of the "Date From" field.
   * @param params - Validation parameters.
   *
   * @returns `true` if valid, error message if invalid.
   */
  (dateFrom, { formFields, scheduleValidation }): boolean | string => {
    // Schedule validation for the associated "Date To" field
    scheduleValidation(dateToKey);

    // If "Date From" is not set, consider it valid
    if (!dateFrom) {
      return true;
    }

    const dateTo = formFields[dateToKey].value;

    // If ignoring time, reset hours, minutes, seconds, and milliseconds
    if (ignoreTime) {
      minDate?.setHours(0, 0, 0, 0);
      maxDate?.setHours(0, 0, 0, 0);

      dateFrom.setHours(0, 0, 0, 0);
      dateTo?.setHours(0, 0, 0, 0);
    }

    if (
      (!minDate || dateFrom.getTime() >= minDate.getTime()) &&
      (!maxDate || dateFrom.getTime() <= maxDate.getTime()) &&
      (!dateTo ||
        (inclusiveRange
          ? dateFrom.getTime() <= dateTo.getTime()
          : dateFrom.getTime() < dateTo.getTime()))
    ) {
      return true;
    }

    return errorMsg;
  };

interface CreateHoneyFormDateToValidatorOptions<
  Form extends CustomDateRangeForm<DateFromKey, DateToKey>,
  DateToKey extends DatePropertyKey<Form>,
  DateFromKey extends Exclude<DatePropertyKey<Form>, DateToKey>,
> {
  dateFromKey: DateFromKey;
  minDate?: Date;
  maxDate?: Date;
  errorMsg?: string;
  ignoreTime?: boolean;
  inclusiveRange?: boolean;
}

/**
 * Creates a validator function to ensure the validity of a "Date To" field within the context of a date range.
 *
 * @param options - Options for creating the validator.
 *
 * @returns The validator function for "Date To" field.
 */
export const createHoneyFormDateToValidator =
  <
    Form extends CustomDateRangeForm<DateFromKey, DateToKey>,
    FormContext = undefined,
    DateToKey extends DatePropertyKey<Form> = DatePropertyKey<Form>,
    DateFromKey extends Exclude<DatePropertyKey<Form>, DateToKey> = Exclude<
      DatePropertyKey<Form>,
      DateToKey
    >,
  >({
    dateFromKey,
    minDate,
    maxDate,
    errorMsg = '"Date To" should be equal or greater than "Date From"',
    ignoreTime = true,
    inclusiveRange = true,
  }: CreateHoneyFormDateToValidatorOptions<
    Form,
    DateToKey,
    DateFromKey
  >): HoneyFormObjectFieldValidator<Form, DateToKey, FormContext> =>
  /**
   * Validator function for "Date To" field.
   *
   * @param dateTo - The value of the "Date To" field.
   * @param params - Validation parameters.
   *
   * @returns `true` if valid, error message if invalid.
   */
  (dateTo, { formFields, scheduleValidation }): boolean | string => {
    // Schedule validation for the associated "Date From" field
    scheduleValidation(dateFromKey);

    // If "Date To" is not set, consider it valid
    if (!dateTo) {
      return true;
    }

    const dateFrom = formFields[dateFromKey].value;

    // If ignoring time, reset hours, minutes, seconds, and milliseconds
    if (ignoreTime) {
      minDate?.setHours(0, 0, 0, 0);
      maxDate?.setHours(0, 0, 0, 0);

      dateTo.setHours(0, 0, 0, 0);
      dateFrom?.setHours(0, 0, 0, 0);
    }

    if (
      (!minDate || dateTo.getTime() >= minDate.getTime()) &&
      (!maxDate || dateTo.getTime() <= maxDate.getTime()) &&
      (!dateFrom ||
        (inclusiveRange
          ? dateFrom.getTime() <= dateTo.getTime()
          : dateFrom.getTime() < dateTo.getTime()))
    ) {
      return true;
    }

    return errorMsg;
  };

export const BUILT_IN_FIELD_VALIDATORS: HoneyFormFieldBuiltInValidator[] = [
  requiredBuiltInFieldValidator,
];

export const BUILT_IN_INTERACTIVE_FIELD_VALIDATORS: HoneyFormInteractiveFieldBuiltInValidator[] = [
  // number
  minValueBuiltInFieldValidator,
  maxValueBuiltInFieldValidator,
  minMaxValueBuiltInFieldValidator,
  // string
  minLengthBuiltInFieldValidator,
  maxLengthBuiltInFieldValidator,
  minMaxLengthBuiltInFieldValidator,
];
