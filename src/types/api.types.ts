import type { MutableRefObject } from 'react';

import type {
  HoneyFormAddFormField,
  HoneyFormClearErrors,
  HoneyFormDefaultValues,
  HoneyFormErrors,
  HoneyFormFields,
  HoneyFormRemoveFormField,
  HoneyFormReset,
  HoneyFormRestoreUnfinishedForm,
  HoneyFormSetFormErrors,
  HoneyFormSetFormValues,
  HoneyFormSubmit,
  HoneyFormValidate,
} from './types';
import type { HoneyFormFieldAddError, HoneyFormFieldAddErrors } from './field.types';
import type { HoneyFormBaseForm, HoneyFormId, HoneyFormValues } from './common.types';

export interface HoneyFormApi<Form extends HoneyFormBaseForm, FormContext = undefined> {
  /**
   * Form ID.
   */
  formId: HoneyFormId;
  /**
   * Reference to form fields.
   */
  formFieldsRef: MutableRefObject<HoneyFormFields<Form, FormContext>>;
  /**
   * Form context.
   *
   * @default undefined
   */
  formContext: FormContext;
  /**
   * An object that contains the state of the form fields.
   *
   * @default {}
   */
  formFields: HoneyFormFields<Form, FormContext>;
  /**
   * Provides quick access to the current values of all form fields.
   *
   * @default {}
   */
  formValues: HoneyFormValues<Form>;
  /**
   * Provides quick access to the default values of all form fields.
   *
   * @default {}
   */
  formDefaultValues: HoneyFormDefaultValues<Form>;
  /**
   * @default {}
   */
  formErrors: HoneyFormErrors<Form>;
  /**
   * A boolean value that becomes `true` when the form has any error.
   * It remains `false` when the form is error-free.
   *
   * @default false
   */
  isFormErred: boolean;
  /**
   * @default false
   */
  isFormDefaultsFetching: boolean;
  /**
   * @default false
   */
  isFormDefaultsFetchingErred: boolean;
  /**
   * A boolean value that indicates whether any field value in the form has changed.
   * It is `false` by default and becomes `true` when any field value is changed.
   * It returns to `false` when the form is successfully submitted.
   *
   * @default false
   */
  isFormDirty: boolean;
  /**
   * A boolean value that becomes `true` when the form is in the process of validation.
   * It indicates that the validation of the form's fields is currently underway.
   *
   * @default false
   */
  isFormValidating: boolean;
  /**
   * A boolean value that becomes `true` when the process of form validation has successfully finished,
   *  and no errors have been detected in any of the form's fields.
   *
   * @default false
   */
  isFormValid: boolean;
  /**
   * A boolean value that indicates whether the form is currently submitting.
   *
   * @default false
   */
  isFormSubmitting: boolean;
  /**
   * A boolean value that becomes `true` when the form has been successfully submitted.
   * It resets to `false` when any field value is changed.
   *
   * @default false
   */
  isFormSubmitted: boolean;
  /**
   * A boolean value that becomes `true` if any form field is currently validating using promise-based validator functions.
   * This value changes only when the field value is changed. It does not apply during full form validation.
   *
   * @default false
   */
  isAnyFormFieldValidating: boolean;
  /**
   * A boolean value that indicates whether the form submission is allowed.
   *
   * The value is determined by the following conditions:
   * - `isFormDefaultsFetching` is `false`
   * - `isFormDefaultsFetchingErred` is `false`
   * - `isAnyFormFieldValidating` is `false`
   * - `isFormValidating` is `false`
   * - `isFormSubmitting` is `false`
   *
   * @default true
   */
  isFormSubmitAllowed: boolean;
  /**
   * Sets the values of the form fields.
   */
  setFormValues: HoneyFormSetFormValues<Form>;
  /**
   * Sets the errors for the form fields.
   */
  setFormErrors: HoneyFormSetFormErrors<Form>;
  /**
   * Add a new field to the form.
   */
  addFormField: HoneyFormAddFormField<Form, FormContext>;
  /**
   * Removes a field from the form.
   */
  removeFormField: HoneyFormRemoveFormField<Form>;
  /**
   * Adds an error to a specific form field.
   */
  addFormFieldError: HoneyFormFieldAddError<Form>;
  /**
   * Adds the errors to a specific form field.
   */
  addFormFieldErrors: HoneyFormFieldAddErrors<Form>;
  /**
   * Clears all form errors.
   */
  clearFormErrors: HoneyFormClearErrors;
  /**
   * Validates the entire form.
   */
  validateForm: HoneyFormValidate<Form>;
  /**
   * Submits the form by invoking the submit handler and handling server errors if they present.
   */
  submitForm: HoneyFormSubmit<Form, FormContext>;
  /**
   * Reset the form to the initial state.
   */
  resetForm: HoneyFormReset<Form>;
  /**
   * Restores the form to an unfinished state.
   */
  restoreUnfinishedForm: HoneyFormRestoreUnfinishedForm;
}

/**
 * Represents an API for managing multiple form instances.
 */
export interface MultiHoneyFormsApi<Form extends HoneyFormBaseForm, FormContext = undefined> {
  /**
   * An array of form instances.
   *
   * @default []
   */
  forms: HoneyFormApi<Form, FormContext>[];
  /**
   * A boolean value that indicates whether the forms are currently submitting.
   *
   * @default false
   */
  isFormsSubmitting: boolean;
  /**
   * Adds a new form instance to the list of managed forms.
   *
   * @param form - The form instance to add.
   *
   * @returns {Function} - A function that, when called, will remove the added form from the list of managed forms.
   */
  addForm: (form: HoneyFormApi<Form, FormContext>) => () => void;
  /**
   * Replaces a form instance with a new form in the list of managed forms.
   *
   * @param targetForm - The form instance to be replaced.
   * @param newForm - The new form instance to replace the old one.
   */
  replaceForm: (
    targetForm: HoneyFormApi<Form, FormContext>,
    newForm: HoneyFormApi<Form, FormContext>,
  ) => void;
  /**
   * Inserts a new form instance at the specified index in the list of managed forms.
   *
   * @param index - The index at which to insert the form.
   * @param form - The form instance to insert.
   */
  insertForm: (index: number, form: HoneyFormApi<Form, FormContext>) => void;
  /**
   * Removes a form instance from the list of managed forms.
   *
   * @param targetForm - The form instance to remove.
   */
  removeForm: (targetForm: HoneyFormApi<Form, FormContext>) => void;
  /**
   * Removing all form instances from the list.
   */
  clearForms: () => void;
  /**
   * Validates all forms.
   *
   * @returns A Promise resolving to an array of boolean values indicating the validation status of each form.
   */
  validateForms: () => Promise<boolean[]>;
  /**
   * Submits all forms.
   *
   * @returns A Promise resolving to an array of values indicating the submission status of each form.
   */
  submitForms: () => Promise<void[]>;
  /**
   * Resets all forms. Reset their values to defaults and clear all errors.
   */
  resetForms: () => void;
}
