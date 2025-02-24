import type { HoneyFormFieldFormatter } from './types';

/**
 * Creates a string formatter that splits a string into segments of a specified length
 * and joins them using a delimiter.
 *
 * @param {number} segmentLength - The length of each segment.
 * @param {string} delimiter - The delimiter used to join segments. Default: "space".
 * @returns {function(string): string} - The string formatter function.
 */
export const createHoneyFormSplitStringFormatter =
  <FieldValue extends string | undefined, FormContext = undefined>(
    segmentLength: number,
    delimiter: string = ' ',
  ): HoneyFormFieldFormatter<FieldValue, FormContext> =>
  value => {
    if (!value) {
      return value;
    }

    const segments = [];

    for (let i = 0; i < value.length; i += segmentLength) {
      segments.push(value.substring(i, i + segmentLength));
    }

    return segments.join(delimiter) as FieldValue;
  };

export type HoneyFormNumberFormatterOptions = {
  /**
   * Whether to format as a decimal number (e.g., add trailing zeros).
   *
   * @default true
   */
  decimal?: boolean;
  /**
   * The maximum number of digits after the decimal point.
   *
   * @default 2
   */
  maxLengthAfterDecimal?: number;
};

/**
 * Creates a number formatter function to format numeric values based on provided options.
 *
 * @param {HoneyFormNumberFormatterOptions} options - Options for the number formatter.
 *
 * @returns {function(string): string} - The number formatter function.
 *
 * @remarks
 * This function formats numeric input strings according to the specified options.
 */
export const createHoneyFormNumberFormatter =
  <FieldValue extends string | number | undefined, FormContext = undefined>({
    decimal = true,
    maxLengthAfterDecimal = 2,
  }: HoneyFormNumberFormatterOptions = {}): HoneyFormFieldFormatter<FieldValue, FormContext> =>
  value => {
    if ((value !== 0 && !value) || !decimal) {
      return value;
    }

    const parts = String(value).split('.');

    const limitedAfterDecimal = parts[1]?.slice(0, maxLengthAfterDecimal) ?? '';

    if (!parts[0] && !limitedAfterDecimal) {
      return '' as FieldValue;
    }

    return `${parts[0]}.${limitedAfterDecimal.padEnd(maxLengthAfterDecimal, '0')}` as FieldValue;
  };
