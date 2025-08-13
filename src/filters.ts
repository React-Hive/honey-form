import { isNilOrEmptyString } from '@react-hive/honey-utils';

import type { HoneyFormBaseForm, HoneyFormFieldFilter } from './types';

interface NumericFilterOptions {
  /**
   * The maximum total length of the resulting numeric string.
   */
  maxLength?: number;
  /**
   * Whether to allow leading zeros in the resulting numeric string.
   *
   * @default true
   */
  allowLeadingZeros?: boolean;
}

/**
 * Creates a filter function to allow only numeric input with optional length constraints.
 *
 * @param options - Options for the numeric filter.
 *
 * @returns The filter function.
 *
 * @remarks
 * This function filters out any non-numeric characters and limits the length of the numeric input.
 * If `allowLeadingZeros` is set to false, it also removes all leading zeros from the resulting string.
 * If `allowLeadingZeros` is true, it preserves leading zeros.
 */
export const createHoneyFormNumericFilter =
  <
    Form extends HoneyFormBaseForm,
    FieldValue extends string | number | undefined,
    FormContext = undefined,
  >({ maxLength, allowLeadingZeros = true }: NumericFilterOptions = {}): HoneyFormFieldFilter<
    Form,
    FieldValue,
    FormContext
  > =>
  value => {
    if (isNilOrEmptyString(value)) {
      return value;
    }

    // Remove non-numeric characters
    let cleanedValue = value.toString().replace(/[^0-9]+/g, '');
    if (!allowLeadingZeros) {
      // Remove all leading zeros
      cleanedValue = cleanedValue.replace(/^0+/, '');
    }

    // Limit the length of the cleaned value
    return cleanedValue.slice(0, maxLength) as FieldValue;
  };

/**
 * Options for configuring the number filter function.
 */
export interface HoneyFormNumberFilterOptions {
  /**
   * Whether to allow decimal numbers (e.g., allow a decimal point '.').
   *
   * @default true
   */
  decimal?: boolean;
  /**
   * Whether to allow negative numbers (e.g., allow a minus sign '-' at the beginning).
   *
   * @default true
   */
  negative?: boolean;
  /**
   * Add commas for thousands.
   *
   * @default false
   */
  splitThousands?: boolean;
  /**
   * The maximum length of characters before the decimal point.
   *
   * @default 9
   */
  maxLengthBeforeDecimal?: number;
  /**
   * The maximum length of characters after the decimal point.
   *
   * @default 2
   */
  maxLengthAfterDecimal?: number;
}

/**
 * Creates a filter function to allow numbers and format them based on provided options.
 *
 * @param options - Options for configuring the number filter.
 *
 * @returns The filter function that formats and filters the numeric string.
 *
 * @remarks
 * The filter function performs the following operations:
 * 1. Removes non-numeric characters (except for optional decimal point and minus sign).
 * 2. Handles leading zeros in the integer part.
 * 3. Limits the length of integer and fractional parts based on the provided options.
 * 4. Ensures proper filtering with optional negative sign and decimal point.
 */
export const createHoneyFormNumberFilter =
  <
    Form extends HoneyFormBaseForm,
    FieldValue extends string | number | undefined,
    FormContext = undefined,
  >({
    maxLengthBeforeDecimal = 9,
    maxLengthAfterDecimal = 2,
    decimal = true,
    negative = true,
    splitThousands = false,
  }: HoneyFormNumberFilterOptions = {}): HoneyFormFieldFilter<Form, FieldValue, FormContext> =>
  value => {
    if (isNilOrEmptyString(value)) {
      return value;
    }

    const pattern = new RegExp(`[^0-9${decimal ? '.' : ''}${negative ? '-' : ''}]+`, 'g');
    let cleanedValue = value.toString().replace(pattern, '');

    let isNegativeSignPresent = false;
    if (negative) {
      isNegativeSignPresent = cleanedValue.startsWith('-');
      // Remove any additional minus signs that may be present
      cleanedValue = cleanedValue.replace(/-/g, '');
    }

    // Split by the decimal point
    const [integerPart, fractionPart] = cleanedValue.split('.');

    // If decimals are allowed, remove extra leading zeros but keep a single zero
    //  if it's the only digit (e.g., "0005" → "5", "0" → "0").
    //
    // If decimals are not allowed, collapse all zeros to a single "0" if the input is all zeros,
    //  otherwise strip all leading zeros (e.g., "00" → "0", "0005" → "5").
    const limitedIntegerPart = decimal
      ? integerPart.replace(/^0+(?=\d)/, '')
      : /^0+$/.test(integerPart)
        ? '0'
        : integerPart.replace(/^0+/, '');

    // Limit the lengths of the parts based on the maxLength options
    const limitedBeforeDecimal = limitedIntegerPart.slice(0, maxLengthBeforeDecimal);
    const limitedAfterDecimal = fractionPart?.slice(0, maxLengthAfterDecimal);

    const integerWithCommas = splitThousands
      ? limitedBeforeDecimal.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      : limitedBeforeDecimal;

    // Combine the parts back with the decimal point
    const result =
      limitedAfterDecimal === undefined
        ? integerWithCommas
        : `${integerWithCommas}.${limitedAfterDecimal}`;

    // Prepend the negative sign if the original value was negative
    return (isNegativeSignPresent ? `-${result}` : result) as FieldValue;
  };
