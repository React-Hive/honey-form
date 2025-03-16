export type HoneyFormId = string;

export type HoneyFormFieldName = string;

/**
 * Defines the structure of a basic form where each field is identified by a name and holds a value.
 *
 * This type is a generic representation of a form where field names are strings, and field values
 * can be of any type. It serves as a base type for defining more specific forms with defined field types.
 */
export type HoneyFormBaseForm = Record<HoneyFormFieldName, unknown>;

/**
 * Represents a child form that inherits the structure of a basic form.
 *
 * This type is used to define forms that are nested within a parent form. It is essentially the same
 * as `HoneyFormBaseForm`, indicating that child forms follow the same structure as the base form.
 */
export type HoneyFormBaseChildForm = HoneyFormBaseForm;

/**
 * Defines the possible values for each field in a form, allowing for fields to be `undefined`.
 *
 * The type maps each field name to either its value or `undefined`. This is useful when a field's value
 * may not be set or initialized, allowing for flexibility in handling default values or optional fields.
 */
export type HoneyFormValues<Form extends HoneyFormBaseForm> = {
  [FieldName in keyof Form]: Form[FieldName] | undefined;
};
