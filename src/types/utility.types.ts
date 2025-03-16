import type { HoneyFormBaseChildForm } from './common.types';

export type KeysWithArrayValues<T> = {
  [K in keyof T]: T[K] extends unknown[] ? K : never;
}[keyof T];

/**
 * Utility type that extracts an array of child forms from a given field value.
 */
export type HoneyFormExtractChildForms<FieldValue> = FieldValue extends (infer ChildForm extends
  HoneyFormBaseChildForm)[]
  ? ChildForm[]
  : never;

/**
 * Utility type that extracts a single child form from a given field value.
 */
export type HoneyFormExtractChildForm<FieldValue> = FieldValue extends (infer ChildForm extends
  HoneyFormBaseChildForm)[]
  ? ChildForm
  : never;
