import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type {
  Nullable,
  FormOptions,
  HoneyFormBaseForm,
  HoneyFormFieldAddError,
  HoneyFormFieldClearErrors,
  HoneyFormDefaultValues,
  HoneyFormFields,
  HoneyFormState,
  HoneyFormFieldPushValue,
  HoneyFormFieldRemoveValue,
  HoneyFormFieldSetValueInternal,
  HoneyFormFieldAddErrors,
  HoneyFormFieldFinishAsyncValidation,
  HoneyFormValidateField,
  HoneyFormAddFormField,
  HoneyFormClearErrors,
  HoneyFormRemoveFormField,
  HoneyFormReset,
  HoneyFormSetFormErrors,
  HoneyFormSetFormValues,
  HoneyFormSubmit,
  HoneyFormValidate,
  HoneyFormErrors,
  KeysWithArrayValues,
  HoneyFormRestoreUnfinishedForm,
} from '../types';
import {
  resetAllFields,
  createField,
  executeFieldValidator,
  executeFieldValidatorAsync,
  getNextErredField,
  getNextFieldsState,
  getNextErrorsFreeField,
  getNextSingleFieldState,
  getNextAsyncValidatedField,
  processSkippableFields,
} from '../field';
import {
  checkIfHoneyFormFieldIsInteractive,
  checkIfFieldIsNestedForms,
  forEachFormError,
  getFormErrors,
  getFormValues,
  getSubmitFormValues,
  checkIsSkipField,
  mapFormFields,
  mapServerErrors,
  runChildFormsValidation,
  warningMessage,
  errorMessage,
  deserializeFormFromQueryString,
  serializeFormToQueryString,
} from '../helpers';
import { HONEY_FORM_ERRORS } from '../constants';

const FORM_DEFAULTS = {};

const INITIAL_FORM_STATE: HoneyFormState = {
  isValidating: false,
  isSubmitting: false,
};

export const useBaseHoneyForm = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FormContext = undefined,
>({
  initialFormFieldsStateResolver,
  fields: fieldsConfig,
  name: formName,
  parentField,
  defaults = FORM_DEFAULTS,
  readDefaultsFromStorage = false,
  values: externalValues,
  resetAfterSubmit = false,
  validateExternalValues = false,
  alwaysValidateParentField = false,
  storage,
  context: formContext,
  onAfterValidate,
  onSubmit,
  onChange,
  onChangeDebounce,
}: FormOptions<ParentForm, ParentFieldName, Form, FormContext>) => {
  const formId = useId();

  const [formState, setFormState] = useState<HoneyFormState>(INITIAL_FORM_STATE);

  const [isFormDefaultsFetching, setIsFormDefaultsFetching] = useState(false);
  const [isFormDefaultsFetchingErred, setIsFormDefaultsFetchingErred] = useState(false);

  const [formDefaults] = useState<HoneyFormDefaultValues<Form>>(() => {
    if (readDefaultsFromStorage && formName) {
      if (storage === 'qs') {
        // Defaults from storage can extend/override the defaults set via property
        return { ...defaults, ...deserializeFormFromQueryString(fieldsConfig, formName) };
      }
    }

    return typeof defaults === 'function' ? {} : { ...defaults };
  });

  const formDefaultsRef = useRef<HoneyFormDefaultValues<Form>>(formDefaults);
  const formContextRef = useRef<FormContext>(formContext);
  formContextRef.current = formContext;

  const formFieldsRef = useRef<Nullable<HoneyFormFields<Form, FormContext>>>(null);
  const formValuesRef = useRef<Nullable<Form>>(null);
  const formErrorsRef = useRef<Nullable<HoneyFormErrors<Form>>>(null);
  const isFormDirtyRef = useRef(false);
  const isFormValidRef = useRef(false);
  const isUnfinishedFormDetected = useRef(false);
  const isFormSubmittedRef = useRef(false);
  const onChangeFormTimeoutIdRef = useRef<Nullable<number>>(null);
  const onChangeFieldsTimeoutIdRef = useRef<Record<keyof Form, Nullable<number>>>({} as never);

  const updateFormState = useCallback((newFormState: Partial<HoneyFormState>) => {
    setFormState(prevFormState => ({ ...prevFormState, ...newFormState }));
  }, []);

  /**
   * Handles form field changes with optional debouncing.
   *
   * This function is designed to manage updates to form fields, incorporating an optional debounced mechanism
   * to limit the frequency of form updates.
   *
   * @param initiatorFieldName - The name of the field that triggered the change. This is used to determine
   *                             the appropriate delay time if a custom delay setting (`changeDelay`) is provided for that field.
   * @param fn - A function that returns the next state of the form fields after processing the change.
   * @param isSkipOnChange - If true, bypasses the debouncing mechanism and directly applies the changes
   *                         by calling the provided function without delay.
   *
   * @returns The updated form fields after handling the change.
   */
  const formChangeProcessor = (
    initiatorFieldName: Nullable<keyof Form>,
    fn: () => HoneyFormFields<Form, FormContext>,
    isSkipOnChange = false,
  ): HoneyFormFields<Form, FormContext> => {
    // If `isSkipOnChange` is `true`, skip debouncing and directly return the result of the provided function.
    if (isSkipOnChange) {
      return fn();
    }

    const nextFormFields = fn();

    if (!parentField) {
      if (storage === 'qs') {
        const formValues = getSubmitFormValues(parentField, formContextRef.current, nextFormFields);

        serializeFormToQueryString(fieldsConfig, formName, formValues);
      }
    }

    // If `onChange` is provided, set a timeout for debouncing and call `onChange` after the timeout.
    if (onChange) {
      const initiateOnChange = () => {
        const formFields = formFieldsRef.current;
        if (!formFields) {
          throw new Error(HONEY_FORM_ERRORS.emptyFormFieldsRef);
        }

        const formValues = getFormValues(nextFormFields);
        const cleanFormValues = getSubmitFormValues(
          parentField,
          formContextRef.current,
          nextFormFields,
        );
        const formErrors = getFormErrors(nextFormFields);

        onChange(cleanFormValues, {
          parentField,
          formFields,
          formValues,
          formErrors,
          formContext: formContextRef.current,
        });
      };

      const debounceTime = initiatorFieldName
        ? (formFieldsRef.current[initiatorFieldName].config.onChangeDebounce ?? onChangeDebounce)
        : onChangeDebounce;

      if (debounceTime) {
        if (onChangeFormTimeoutIdRef.current) {
          clearTimeout(onChangeFormTimeoutIdRef.current);
        }

        onChangeFormTimeoutIdRef.current = window.setTimeout(() => {
          onChangeFormTimeoutIdRef.current = null;

          initiateOnChange();
        }, debounceTime);
      } else {
        initiateOnChange();
      }
    }

    return nextFormFields;
  };

  const formFieldChangeProcessor = (
    fieldName: keyof Form,
    fn: () => HoneyFormFields<Form, FormContext>,
  ) => {
    if (onChangeFieldsTimeoutIdRef.current[fieldName]) {
      clearTimeout(onChangeFieldsTimeoutIdRef.current[fieldName]);
    }

    const nextFormFields = fn();

    const fieldConfig = nextFormFields[fieldName].config;

    if (fieldConfig.onChange) {
      onChangeFieldsTimeoutIdRef.current[fieldName] = window.setTimeout(() => {
        onChangeFieldsTimeoutIdRef.current[fieldName] = null;

        const cleanValue = checkIfFieldIsNestedForms(fieldConfig)
          ? (nextFormFields[fieldName].getChildFormsValues() as Form[typeof fieldName])
          : nextFormFields[fieldName].cleanValue;

        fieldConfig.onChange(cleanValue, {
          formContext,
          formFields: nextFormFields,
        });
      }, fieldConfig.onChangeDebounce ?? 0);
    }

    return nextFormFields;
  };

  const setFormValues = useCallback<HoneyFormSetFormValues<Form>>(
    (
      values,
      { isValidate = true, isDirty = true, isClearAll = false, isSkipOnChange = false } = {},
    ) => {
      if (isDirty) {
        isFormDirtyRef.current = true;
      }

      const nextFormFields = formChangeProcessor(
        null,
        () => {
          const formFields = formFieldsRef.current;

          const nextFormFields = { ...formFields };

          if (isClearAll) {
            resetAllFields(nextFormFields);
          }

          Object.keys(values).forEach((fieldName: keyof Form) => {
            if (!(fieldName in nextFormFields)) {
              throw new Error(
                `[honey-form]: Attempted to set value for non-existent field "${fieldName.toString()}"`,
              );
            }

            const fieldConfig = nextFormFields[fieldName].config;

            const filteredValue =
              checkIfHoneyFormFieldIsInteractive(fieldConfig) && fieldConfig.filter
                ? fieldConfig.filter(values[fieldName], { formContext })
                : values[fieldName];

            const nextFormField = isValidate
              ? executeFieldValidator({
                  formContext,
                  fieldName,
                  formFields: nextFormFields,
                  fieldValue: filteredValue,
                })
              : getNextErrorsFreeField(nextFormFields[fieldName]);

            nextFormFields[fieldName] = getNextSingleFieldState(nextFormField, filteredValue, {
              formContext,
              isFormat: true,
            });
          });

          processSkippableFields({ parentField, nextFormFields, formContext });

          return nextFormFields;
        },
        isSkipOnChange,
      );

      formFieldsRef.current = nextFormFields;
      setFormFields(nextFormFields);

      if (parentField) {
        parentField.validate();
      }
    },
    [formContext],
  );

  /**
   * @template Form - The type representing the structure of the entire form.
   */
  const setFormErrors = useCallback<HoneyFormSetFormErrors<Form>>(formErrors => {
    setFormFields(formFields => {
      const nextFormFields = { ...formFields };

      forEachFormError(formErrors, (fieldName, fieldErrors) => {
        nextFormFields[fieldName] = getNextErredField(nextFormFields[fieldName], fieldErrors);
      });

      formFieldsRef.current = nextFormFields;
      return nextFormFields;
    });
  }, []);

  const clearFormErrors = useCallback<HoneyFormClearErrors>(() => {
    setFormFields(formFields => {
      const nextFormFields = mapFormFields(formFields, (_, formField) =>
        getNextErrorsFreeField(formField),
      ) as unknown as HoneyFormFields<Form, FormContext>;

      formFieldsRef.current = nextFormFields;
      return nextFormFields;
    });
  }, []);

  const finishFieldAsyncValidation: HoneyFormFieldFinishAsyncValidation<Form> = fieldName => {
    setFormFields(formFields => {
      const nextFormFields = {
        ...formFields,
        [fieldName]: getNextAsyncValidatedField(formFields[fieldName]),
      };

      formFieldsRef.current = nextFormFields;
      return nextFormFields;
    });
  };

  const setFieldValue: HoneyFormFieldSetValueInternal<Form> = (
    fieldName,
    fieldValue,
    { isValidate = true, isDirty = true, isFormat = true, isSetChildFormsValues = true } = {},
  ) => {
    // Any new field value clears the next form states
    isFormValidRef.current = false;
    isFormSubmittedRef.current = false;

    if (isDirty) {
      isFormDirtyRef.current = true;
    }

    const nextFormFields = formChangeProcessor(fieldName, () => {
      const formFields = formFieldsRef.current;
      const formField = formFields[fieldName];

      const isFieldErred = formField.errors.length > 0;
      const isRevalidate = isValidate || isFieldErred;

      return formFieldChangeProcessor(fieldName, () => {
        const nextFormFields = getNextFieldsState(fieldName, fieldValue, {
          parentField,
          formContext,
          formFields,
          isFormat,
          finishFieldAsyncValidation,
          // Re-validate the field immediately if it previously had errors or if forced to validate
          isValidate: isRevalidate,
        });

        if (parentField) {
          if (
            alwaysValidateParentField ||
            isFieldErred ||
            nextFormFields[fieldName].errors.length
          ) {
            // Use a timeout to avoid rendering the parent form during this field's render cycle
            setTimeout(() => {
              parentField.validate();
            }, 0);
          }
        }

        if (isSetChildFormsValues) {
          const fieldConfig = nextFormFields[fieldName].config;

          if (checkIfFieldIsNestedForms(fieldConfig)) {
            const childForms = formField.__meta__.childForms ?? [];

            if (childForms.length) {
              if (!Array.isArray(fieldValue)) {
                throw new Error(
                  '[honey-form]: Expected `fieldValue` to be an array when setting values for child forms. Received type: ' +
                    typeof fieldValue,
                );
              }

              if (childForms.length !== fieldValue.length) {
                throw new Error(
                  `[honey-form]: Mismatched length. The number of child forms (${childForms.length}) must match the length of \`fieldValue\` (${fieldValue.length}).`,
                );
              }

              childForms.forEach((childForm, childFormIndex) => {
                childForm.setFormValues(fieldValue[childFormIndex], {
                  isValidate: isRevalidate,
                });
              });
            }
          }
        }

        return nextFormFields;
      });
    });

    formFieldsRef.current = nextFormFields;
    setFormFields(nextFormFields);
  };

  const clearFieldErrors: HoneyFormFieldClearErrors<Form> = fieldName => {
    setFormFields(formFields => {
      const nextFormFields = {
        ...formFields,
        [fieldName]: getNextErrorsFreeField(formFields[fieldName]),
      };

      formFieldsRef.current = nextFormFields;
      return nextFormFields;
    });
  };

  const pushFieldValue: HoneyFormFieldPushValue<Form> = (fieldName, value) => {
    const formFields = formFieldsRef.current;
    if (!formFields) {
      throw new Error(HONEY_FORM_ERRORS.emptyFormFieldsRef);
    }

    setFieldValue(
      fieldName,
      [...(formFields[fieldName].value as []), value] as Form[typeof fieldName],
      {
        isSetChildFormsValues: false,
      },
    );
  };

  /**
   * Removes a value from a specific form field that holds an array of values.
   */
  const removeFieldValue: HoneyFormFieldRemoveValue<Form> = (fieldName, formIndex) => {
    const formFields = formFieldsRef.current;
    if (!formFields) {
      throw new Error(HONEY_FORM_ERRORS.emptyFormFieldsRef);
    }

    const fieldValue = formFields[fieldName]
      .getChildFormsValues()
      .filter((_, index) => index !== formIndex) as Form[typeof fieldName];

    setFieldValue(fieldName, fieldValue, {
      isSetChildFormsValues: false,
    });
  };

  const validateField: HoneyFormValidateField<Form> = fieldName => {
    const formFields = formFieldsRef.current;
    const formField = formFields[fieldName];

    let filteredValue: Form[typeof fieldName];

    if (checkIfHoneyFormFieldIsInteractive(formField.config) && formField.config.filter) {
      filteredValue = formField.config.filter(formField.rawValue, { formContext });
      //
    } else if (checkIfFieldIsNestedForms(formField.config)) {
      filteredValue = formField.getChildFormsValues() as Form[typeof fieldName];
      //
    } else {
      filteredValue = formField.rawValue;
    }

    const nextFormField = executeFieldValidator({
      formContext,
      formFields,
      fieldName,
      fieldValue: filteredValue,
    });

    const nextFormFields = {
      ...formFields,
      [fieldName]: nextFormField,
    };

    formFieldsRef.current = nextFormFields;
    setFormFields(nextFormFields);
  };

  const addFormFieldErrors = useCallback<HoneyFormFieldAddErrors<Form>>((fieldName, errors) => {
    setFormFields(formFields => {
      const formField = formFields[fieldName];

      const nextFormFields = {
        ...formFields,
        [fieldName]: {
          ...formField,
          // When the form can have alien field errors when the server can return non-existed form fields
          errors: [...(formField?.errors ?? []), ...errors],
        },
      };

      formFieldsRef.current = nextFormFields;
      return nextFormFields;
    });
  }, []);

  const addFormFieldError = useCallback<HoneyFormFieldAddError<Form>>(
    (fieldName, error) => addFormFieldErrors(fieldName, [error]),
    [addFormFieldErrors],
  );

  const addFormField = useCallback<HoneyFormAddFormField<Form, FormContext>>(
    (fieldName, fieldConfig) => {
      setFormFields(formFields => {
        if (formFields[fieldName]) {
          warningMessage(`Form field "${fieldName.toString()}" is already present.`);
        }

        const nextFormFields = {
          ...formFields,
          [fieldName]: createField(fieldName, fieldConfig, {
            formContext,
            formFieldsRef,
            formDefaultsRef,
            setFieldValue,
            clearFieldErrors,
            validateField,
            pushFieldValue,
            removeFieldValue,
            addFormFieldErrors,
          }),
        };

        formFieldsRef.current = nextFormFields;
        return nextFormFields;
      });
    },
    [formContext],
  );

  /**
   * Removes a form field from the current form state.
   *
   * This function clears the default value of the specified field and removes it
   * from the form fields. The form's internal state and references are updated accordingly.
   *
   * @template Form - The type representing the structure of the entire form.
   *
   * @param {keyof Form} fieldName - The name of the field to be removed from the form.
   */
  const removeFormField = useCallback<HoneyFormRemoveFormField<Form>>(fieldName => {
    // Clearing the default field value
    delete formDefaultsRef.current[fieldName];

    setFormFields(formFields => {
      const nextFormFields = { ...formFields };
      //
      delete nextFormFields[fieldName];
      //
      formFieldsRef.current = nextFormFields;
      return nextFormFields;
    });
  }, []);

  /**
   * Validates the form fields based on the specified target or excluded field names.
   *
   * This function performs asynchronous validation for the form fields, either targeting
   * specific fields for validation (`targetFields`) or excluding certain fields (`excludeFields`).
   * If neither option is provided, all fields in the form will be validated. It handles validation
   * for both the current form and any child forms.
   *
   * The function skips validation for fields that should not be validated based on the provided
   * parameters, skippable conditions, or form context (e.g., hidden or disabled fields).
   *
   * @param {HoneyFormValidateOptions<Form>} [options] - Optional object containing validation options:
   * - `targetFields`: An array of field names to validate. If provided, only these fields will be validated.
   * - `excludeFields`: An array of field names to exclude from validation. If provided, these fields will be skipped.
   *
   * @returns {Promise<boolean>} - A promise that resolves to `true` if all validations pass (i.e., no errors),
   * and `false` if any validation errors are found.
   *
   * @throws {Error} - Throws an error if `formFieldsRef` is empty or undefined, indicating missing form field references.
   *
   * @remarks
   * - The function checks for validation errors in child forms as well. If any child forms have errors, validation fails.
   * - Fields marked to be skipped via `excludeFields` or skippable based on the form's context or specific logic will not be validated.
   * - Validation errors labeled as `server` errors will not prevent the form from being considered valid.
   */
  const validateForm = useCallback<HoneyFormValidate<Form>>(
    async ({ targetFields, excludeFields } = {}) => {
      const formFields = formFieldsRef.current;
      if (!formFields) {
        throw new Error(HONEY_FORM_ERRORS.emptyFormFieldsRef);
      }

      // Variable to track if any errors are found during validation
      let isFormErred = false;

      const nextFormFields = {} as HoneyFormFields<Form, FormContext>;

      const formValues = getFormValues(formFields);

      await Promise.all(
        Object.keys(formFields).map(async (fieldName: keyof Form) => {
          const formField = formFields[fieldName];

          const isTargetFieldValidation = targetFields?.length
            ? targetFields.includes(fieldName)
            : true;

          const isExcludeFieldFromValidation = excludeFields
            ? excludeFields.includes(fieldName)
            : false;

          if (
            isExcludeFieldFromValidation ||
            !isTargetFieldValidation ||
            checkIsSkipField({
              parentField,
              fieldName,
              formContext,
              formFields,
              formValues,
            })
          ) {
            nextFormFields[fieldName] = getNextErrorsFreeField(formField);
            return;
          }

          const hasChildFormsErrors = await runChildFormsValidation(formField);
          if (hasChildFormsErrors) {
            isFormErred = true;
          }

          const nextField = await executeFieldValidatorAsync({
            parentField,
            fieldName,
            formFields,
            formContext,
          });

          isFormErred ||= nextField.errors.some(fieldError => fieldError.type !== 'server');

          nextFormFields[fieldName] = nextField;
        }),
      );

      isFormValidRef.current = !isFormErred;

      // Set the new `nextFormFields` value to the ref to access it at getting clean values at submitting
      formFieldsRef.current = nextFormFields;

      setFormFields(nextFormFields);

      await onAfterValidate?.({
        isFormErred,
        formContext,
        formFields: nextFormFields,
        formErrors: getFormErrors(nextFormFields),
      });

      return !isFormErred;
    },
    [formContext, onAfterValidate],
  );

  /**
   * Validates the form fields, updating the form state to reflect validation progress and status.
   *
   * This function provides an outer wrapper around the internal `validateForm` function, adding
   * state management to signal when validation is in progress (`isValidating`). It helps manage
   * the UI state during validation, ensuring that the form reflects whether it is currently being validated.
   *
   * @param {HoneyFormValidateOptions<Form>} [validateOptions] - Optional object specifying fields to validate or exclude:
   * - `targetFields`: An array of field names to validate. If provided, only these fields will be validated.
   * - `excludeFields`: An array of field names to exclude from validation. If provided, these fields will be skipped.
   *
   * @returns {Promise<boolean>} - A promise that resolves to `true` if all validations pass (i.e., no errors), or `false` if any validation errors are found.
   *
   * @remarks
   * - The form's state is updated to indicate when validation starts (`isValidating: true`) and when it completes (`isValidating: false`).
   * - This function ensures that validation status is reflected in the form state, allowing for better UI feedback during the process.
   */
  const outerValidateForm = useCallback<HoneyFormValidate<Form>>(
    async validateOptions => {
      try {
        // Update the form state to indicate that validation is in progress
        updateFormState({
          isValidating: true,
        });

        return await validateForm(validateOptions);
      } finally {
        // Ensure the form state is updated to reflect that validation is complete, regardless of the result
        updateFormState({
          isValidating: false,
        });
      }
    },
    [validateForm],
  );

  const getInitialFormFieldsState = () =>
    initialFormFieldsStateResolver({
      formContext,
      formFieldsRef,
      formDefaultsRef,
      setFieldValue,
      clearFieldErrors,
      validateField,
      pushFieldValue,
      removeFieldValue,
      addFormFieldErrors,
    });

  const resetForm: HoneyFormReset<Form> = newFormDefaults => {
    isFormDirtyRef.current = false;
    isFormValidRef.current = false;
    isFormSubmittedRef.current = false;

    if (newFormDefaults) {
      formDefaultsRef.current = { ...formDefaultsRef.current, ...newFormDefaults };
    }

    setFormFields(getInitialFormFieldsState);

    if (parentField) {
      parentField.validate();
    }
  };

  const restoreUnfinishedForm = useCallback<HoneyFormRestoreUnfinishedForm>(() => {
    isUnfinishedFormDetected.current = false;

    setFormValues({});
  }, []);

  const submitForm = useCallback<HoneyFormSubmit<Form, FormContext>>(
    async formSubmitHandler => {
      if (!formFieldsRef.current) {
        throw new Error(HONEY_FORM_ERRORS.emptyFormFieldsRef);
      }

      if (!formSubmitHandler && !onSubmit) {
        throw new Error(HONEY_FORM_ERRORS.submitHandlerOrOnSubmit);
      }

      try {
        updateFormState({
          isValidating: true,
        });

        const isFormValid = await validateForm();
        if (isFormValid) {
          // Only submitting the form can clear the dirty state
          updateFormState({
            isValidating: false,
            isSubmitting: true,
          });

          const submitData = getSubmitFormValues(parentField, formContext, formFieldsRef.current);
          const submitHandler = formSubmitHandler || onSubmit;

          const serverErrors = await submitHandler(submitData, { formContext });

          if (serverErrors && Object.keys(serverErrors).length) {
            setFormErrors(
              mapServerErrors(serverErrors, (_, fieldErrors) =>
                fieldErrors.map(errorMsg => ({
                  type: 'server',
                  message: errorMsg,
                })),
              ),
            );
          } else if (resetAfterSubmit) {
            return resetForm();
          }

          isFormDirtyRef.current = false;
          isFormSubmittedRef.current = true;

          if (storage === 'qs') {
            serializeFormToQueryString(fieldsConfig, formName, submitData);
          }
        }
      } finally {
        updateFormState({
          isValidating: false,
          isSubmitting: false,
        });
      }
    },
    [validateForm, onSubmit],
  );

  const [formFields, setFormFields] = useState(getInitialFormFieldsState);
  //
  formFieldsRef.current = formFields;

  // Detect changes in `externalValues` and update the form values accordingly
  useEffect(() => {
    if (externalValues) {
      setFormValues(externalValues, {
        isValidate: validateExternalValues,
        isDirty: false,
        isSkipOnChange: true,
      });
    }
  }, [externalValues, validateExternalValues]);

  useEffect(() => {
    if (typeof defaults === 'function') {
      setIsFormDefaultsFetching(true);

      defaults()
        .then(defaultValues => {
          // Returned defaults from promise function can extend/override the defaults set via property
          formDefaultsRef.current = { ...formDefaultsRef.current, ...defaultValues };

          setFormValues(defaultValues, {
            isValidate: false,
            isDirty: false,
            isSkipOnChange: true,
          });
        })
        .catch(() => {
          errorMessage('Unable to fetch or process the form default values.');

          setIsFormDefaultsFetchingErred(true);
        })
        .finally(() => setIsFormDefaultsFetching(false));
    }
  }, []);

  const formValues = useMemo(() => getFormValues(formFields), [formFields]);
  formValuesRef.current = formValues;

  const formErrors = useMemo(() => getFormErrors(formFields), [formFields]);
  formErrorsRef.current = formErrors;

  const isAnyFormFieldValidating = useMemo(
    () => Object.keys(formFields).some(formField => formFields[formField].isValidating),
    [formFields],
  );

  const isFormErred = Object.keys(formErrors).length > 0;

  const isFormSubmitAllowed =
    !isFormDefaultsFetching &&
    !isFormDefaultsFetchingErred &&
    !isAnyFormFieldValidating &&
    !formState.isValidating &&
    !formState.isSubmitting;

  return {
    formId,
    formContext,
    formFieldsRef,
    // Getters are needed to get the form fields, values and etc. using multi forms
    get formDefaultValues() {
      return formDefaultsRef.current;
    },
    get formFields() {
      return formFieldsRef.current;
    },
    get formValues() {
      return formValuesRef.current;
    },
    get formErrors() {
      return formErrorsRef.current;
    },
    get isFormDirty() {
      return isFormDirtyRef.current;
    },
    get isFormValidating() {
      return formState.isValidating;
    },
    get isFormValid() {
      return isFormValidRef.current;
    },
    get isFormSubmitting() {
      return formState.isSubmitting;
    },
    get isFormSubmitted() {
      return isFormSubmittedRef.current;
    },
    isFormDefaultsFetching,
    isFormDefaultsFetchingErred,
    isFormErred,
    isAnyFormFieldValidating,
    isFormSubmitAllowed,
    // functions
    setFormValues,
    setFormErrors,
    addFormField,
    removeFormField,
    addFormFieldErrors,
    addFormFieldError,
    clearFormErrors,
    validateForm: outerValidateForm,
    submitForm,
    resetForm,
    restoreUnfinishedForm,
  };
};
