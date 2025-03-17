import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type {
  Nullable,
  KeysWithArrayValues,
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
  HoneyFormRestoreUnfinishedForm,
  HoneyFormFieldsValidationController,
  HoneyFormBaseExecutionContext,
} from '../types';
import {
  resetAllFields,
  createFormField,
  executeFieldValidator,
  executeFieldValidatorAsync,
  getNextErredField,
  getNextFieldsState,
  getNextErrorsFreeField,
  getNextFormFieldState,
  getNextAsyncValidatedField,
  processSkippableFields,
} from '../field';
import {
  isFunction,
  errorMessage,
  warningMessage,
  checkIfHoneyFormFieldIsInteractive,
  checkIfFieldIsNestedForms,
  forEachFormError,
  getFormErrors,
  getFormValues,
  getSubmitFormValues,
  checkIsSkipFormField,
  iterateFormFields,
  convertServerErrors,
  runChildFormsValidation,
  deserializeFormFromQueryString,
  serializeFormToQueryString,
  mapFormFieldsAsync,
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

    return isFunction(defaults) ? {} : { ...defaults };
  });

  const formDefaultsRef = useRef<HoneyFormDefaultValues<Form>>(formDefaults);
  const formContextRef = useRef<FormContext>(formContext);
  formContextRef.current = formContext;

  const formFieldsRef = useRef<Nullable<HoneyFormFields<Form, FormContext>>>(null);
  const formValuesRef = useRef<Nullable<Form>>(null);
  const formErrorsRef = useRef<Nullable<HoneyFormErrors<Form>>>(null);
  const formFieldsValidationControllerRef = useRef<HoneyFormFieldsValidationController<Form>>({});
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
   * Processes form field changes with optional debouncing.
   *
   * This function updates form fields and, if applicable, delays invoking the `onChange` callback
   * using a debouncing mechanism. It also handles query string synchronization if `storage` is set to `'qs'`.
   *
   * @param initiatorFieldName - The name of the field that triggered the change. Used to determine
   *                             a custom-debounced delay `onChangeDebounce` if configured.
   * @param fn - A function that returns the updated form fields after processing the change.
   * @param isSkipOnChange - If `true`, applies the changes immediately without debouncing.
   *
   * @returns The updated form fields.
   */
  const formChangeProcessor = (
    initiatorFieldName: Nullable<keyof Form>,
    fn: () => HoneyFormFields<Form, FormContext>,
    isSkipOnChange = false,
  ): HoneyFormFields<Form, FormContext> => {
    const nextFormFields = fn();

    if (!parentField) {
      if (storage === 'qs') {
        const formValues = getSubmitFormValues(parentField, formContextRef.current, nextFormFields);

        serializeFormToQueryString(fieldsConfig, formName, formValues);
      }
    }

    // If `isSkipOnChange` is `true`, skip debouncing and directly return the result of the provided function.
    if (isSkipOnChange) {
      return nextFormFields;
    }

    // If `onChange` is provided, set a timeout for debouncing and call `onChange` after the timeout.
    if (onChange) {
      if (onChangeFormTimeoutIdRef.current) {
        clearTimeout(onChangeFormTimeoutIdRef.current);
      }

      const initiateOnChange = () => {
        const cleanFormValues = getSubmitFormValues(
          parentField,
          formContextRef.current,
          nextFormFields,
        );

        const formValues = getFormValues(nextFormFields);

        const executionContext: HoneyFormBaseExecutionContext<Form, FormContext> = {
          formValues,
          formFields: nextFormFields,
          formContext: formContextRef.current,
        };

        const formErrors = getFormErrors(nextFormFields);

        onChange(cleanFormValues, {
          ...executionContext,
          parentField,
          formErrors,
        });
      };

      const debounceTime = initiatorFieldName
        ? (nextFormFields[initiatorFieldName].config.onChangeDebounce ?? onChangeDebounce)
        : onChangeDebounce;

      if (debounceTime) {
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
      const initiateOnChange = () => {
        const formValues = getFormValues(nextFormFields);

        const cleanValue = checkIfFieldIsNestedForms(fieldConfig)
          ? (nextFormFields[fieldName].getChildFormsValues() as Form[typeof fieldName])
          : nextFormFields[fieldName].cleanValue;

        fieldConfig.onChange(cleanValue, {
          formValues,
          formContext: formContextRef.current,
          formFields: nextFormFields,
        });
      };

      onChangeFieldsTimeoutIdRef.current[fieldName] = window.setTimeout(() => {
        onChangeFieldsTimeoutIdRef.current[fieldName] = null;

        initiateOnChange();
      }, fieldConfig.onChangeDebounce ?? 0);
    }

    return nextFormFields;
  };

  const setFormValues = useCallback<HoneyFormSetFormValues<Form>>(
    (
      values,
      { isValidate = true, isDirty = true, isClearAll = false, isSkipOnChange = false } = {},
    ) => {
      const formFields = formFieldsRef.current;
      if (!formFields) {
        throw new Error(HONEY_FORM_ERRORS.emptyFormFieldsRef);
      }

      if (isDirty) {
        isFormDirtyRef.current = true;
      }

      const nextFormFields = formChangeProcessor(
        null,
        () => {
          let nextFormFields = { ...formFields };

          if (isClearAll) {
            nextFormFields = resetAllFields(nextFormFields);
          }

          const formValues = getFormValues(nextFormFields);

          Object.keys(values).forEach((fieldName: keyof Form) => {
            if (!(fieldName in nextFormFields)) {
              throw new Error(
                `[honey-form]: Attempted to set value for non-existent field "${fieldName.toString()}"`,
              );
            }

            const fieldConfig = nextFormFields[fieldName].config;

            const executionContext: HoneyFormBaseExecutionContext<Form, FormContext> = {
              formValues,
              formContext: formContextRef.current,
              formFields: nextFormFields,
            };

            const filteredValue =
              checkIfHoneyFormFieldIsInteractive(fieldConfig) && fieldConfig.filter
                ? fieldConfig.filter(values[fieldName], executionContext)
                : values[fieldName];

            const nextFormField = isValidate
              ? executeFieldValidator({
                  executionContext,
                  formFieldsValidationControllerRef,
                  fieldName,
                  finishFieldAsyncValidation,
                  fieldValue: filteredValue,
                })
              : getNextErrorsFreeField(nextFormFields[fieldName]);

            nextFormFields[fieldName] = getNextFormFieldState(nextFormField, filteredValue, {
              executionContext,
              isFormat: true,
            });
          });

          const executionContext: HoneyFormBaseExecutionContext<Form, FormContext> = {
            formValues,
            formContext: formContextRef.current,
            formFields: nextFormFields,
          };

          nextFormFields = processSkippableFields({
            executionContext,
            parentField,
          });

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
    [],
  );

  const setFormErrors = useCallback<HoneyFormSetFormErrors<Form>>(formErrors => {
    const formFields = formFieldsRef.current;
    if (!formFields) {
      throw new Error(HONEY_FORM_ERRORS.emptyFormFieldsRef);
    }

    const nextFormFields = { ...formFields };

    forEachFormError(formErrors, (fieldName, fieldErrors) => {
      nextFormFields[fieldName] = getNextErredField(nextFormFields[fieldName], fieldErrors);
    });

    formFieldsRef.current = nextFormFields;
    setFormFields(nextFormFields);
  }, []);

  const clearFormErrors = useCallback<HoneyFormClearErrors>(() => {
    const formFields = formFieldsRef.current;
    if (!formFields) {
      throw new Error(HONEY_FORM_ERRORS.emptyFormFieldsRef);
    }

    const nextFormFields = iterateFormFields(formFields, (_, formField) =>
      getNextErrorsFreeField(formField),
    ) as unknown as HoneyFormFields<Form, FormContext>;

    formFieldsRef.current = nextFormFields;
    setFormFields(nextFormFields);
  }, []);

  const finishFieldAsyncValidation: HoneyFormFieldFinishAsyncValidation<Form> = fieldName => {
    const formFields = formFieldsRef.current;
    if (!formFields) {
      throw new Error(HONEY_FORM_ERRORS.emptyFormFieldsRef);
    }

    const nextFormFields = {
      ...formFields,
      [fieldName]: getNextAsyncValidatedField(formFields[fieldName]),
    };

    formFieldsRef.current = nextFormFields;
    setFormFields(nextFormFields);
  };

  const setFieldValue: HoneyFormFieldSetValueInternal<Form> = (
    fieldName,
    fieldValue,
    { isValidate = true, isDirty = true, isFormat = true, isSetChildFormsValues = true } = {},
  ) => {
    const formFields = formFieldsRef.current;
    if (!formFields) {
      throw new Error(HONEY_FORM_ERRORS.emptyFormFieldsRef);
    }

    // Any new field value clears the next form states
    isFormValidRef.current = false;
    isFormSubmittedRef.current = false;

    if (isDirty) {
      isFormDirtyRef.current = true;
    }

    const executionContext: HoneyFormBaseExecutionContext<Form, FormContext> = {
      formFields,
      formContext: formContextRef.current,
      formValues: getFormValues(formFields),
    };

    const nextFormFields = formChangeProcessor(fieldName, () =>
      formFieldChangeProcessor(fieldName, () => {
        const formField = formFields[fieldName];

        const isFieldPreviouslyErred = formField.errors.length > 0;
        // Validate if the field previously had errors or if forced to validate
        const isValidateField = isValidate || isFieldPreviouslyErred;

        const nextFormFields = getNextFieldsState(fieldName, fieldValue, {
          executionContext,
          formFieldsValidationControllerRef,
          parentField,
          isFormat,
          finishFieldAsyncValidation,
          isValidate: isValidateField,
        });

        if (parentField) {
          const isFieldErred = nextFormFields[fieldName].errors.length > 0;

          if (alwaysValidateParentField || isFieldPreviouslyErred || isFieldErred) {
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
                  isValidate: isValidateField,
                });
              });
            }
          }
        }

        return nextFormFields;
      }),
    );

    formFieldsRef.current = nextFormFields;
    setFormFields(nextFormFields);
  };

  const clearFieldErrors: HoneyFormFieldClearErrors<Form> = fieldName => {
    const formFields = formFieldsRef.current;
    if (!formFields) {
      throw new Error(HONEY_FORM_ERRORS.emptyFormFieldsRef);
    }

    const nextFormFields = {
      ...formFields,
      [fieldName]: getNextErrorsFreeField(formFields[fieldName]),
    };

    formFieldsRef.current = nextFormFields;
    setFormFields(nextFormFields);
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
    if (!formFields) {
      throw new Error(HONEY_FORM_ERRORS.emptyFormFieldsRef);
    }

    const formValues = getFormValues(formFields);

    const executionContext: HoneyFormBaseExecutionContext<Form, FormContext> = {
      formFields,
      formValues,
      formContext: formContextRef.current,
    };

    const formField = formFields[fieldName];

    let filteredValue: Form[typeof fieldName];

    if (checkIfHoneyFormFieldIsInteractive(formField.config) && formField.config.filter) {
      filteredValue = formField.config.filter(formField.rawValue, executionContext);
      //
    } else if (checkIfFieldIsNestedForms(formField.config)) {
      filteredValue = formField.getChildFormsValues() as Form[typeof fieldName];
      //
    } else {
      filteredValue = formField.rawValue;
    }

    const nextFormField = executeFieldValidator({
      executionContext,
      formFieldsValidationControllerRef,
      fieldName,
      finishFieldAsyncValidation,
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
    const formFields = formFieldsRef.current;
    if (!formFields) {
      throw new Error(HONEY_FORM_ERRORS.emptyFormFieldsRef);
    }

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
    setFormFields(nextFormFields);
  }, []);

  const addFormFieldError = useCallback<HoneyFormFieldAddError<Form>>(
    (fieldName, error) => addFormFieldErrors(fieldName, [error]),
    [],
  );

  const addFormField = useCallback<HoneyFormAddFormField<Form, FormContext>>(
    (fieldName, fieldConfig) => {
      const formFields = formFieldsRef.current;
      if (!formFields) {
        throw new Error(HONEY_FORM_ERRORS.emptyFormFieldsRef);
      }

      if (formFields[fieldName]) {
        warningMessage(`Form field "${fieldName.toString()}" is already present.`);
      }

      const nextFormFields: HoneyFormFields<Form, FormContext> = {
        ...formFields,
        [fieldName]: createFormField(fieldName, fieldConfig, {
          formFieldsRef,
          formDefaultsRef,
          setFieldValue,
          clearFieldErrors,
          validateField,
          pushFieldValue,
          removeFieldValue,
          addFormFieldErrors,
          executionContext: {
            formFields,
            formContext: formContextRef.current,
            formValues: getFormValues(formFields),
          },
        }),
      };

      formFieldsRef.current = nextFormFields;
      setFormFields(nextFormFields);
    },
    [],
  );

  /**
   * Removes a form field from the current form state.
   *
   * This function clears the default value of the specified field and removes it
   * from the form fields. The form's internal state and references are updated accordingly.
   *
   * @template Form - The type representing the structure of the entire form.
   *
   * @param fieldName - The name of the field to be removed from the form.
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
   * specific fields for validation `targetFields` or excluding certain fields `excludeFields`.
   * If neither option is provided, all fields in the form will be validated. It handles validation
   * for both the current form and any child forms.
   *
   * The function skips validation for fields that should not be validated based on the provided
   * parameters, skippable conditions, or form context (e.g., hidden or disabled fields).
   *
   * @param [options] - Optional object containing validation options.
   *
   * @returns A promise that resolves to `true` if all validations pass (i.e., no errors),
   *  and `false` if any validation errors are found.
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

      const formValues = getFormValues(formFields);

      const executionContext: HoneyFormBaseExecutionContext<Form, FormContext> = {
        formFields,
        formValues,
        formContext: formContextRef.current,
      };

      const nextFormFields = await mapFormFieldsAsync(formFields, async (fieldName, formField) => {
        const isTargetFieldValidation = targetFields?.length
          ? targetFields.includes(fieldName)
          : true;

        const isExcludeFieldFromValidation = excludeFields
          ? excludeFields.includes(fieldName)
          : false;

        if (
          isExcludeFieldFromValidation ||
          !isTargetFieldValidation ||
          checkIsSkipFormField({
            executionContext,
            parentField,
            fieldName,
          })
        ) {
          return getNextErrorsFreeField(formField);
        }

        const hasChildFormsErrors = await runChildFormsValidation(formField);
        if (hasChildFormsErrors) {
          isFormErred = true;
        }

        const nextField = await executeFieldValidatorAsync({
          executionContext,
          formFieldsValidationControllerRef,
          parentField,
          fieldName,
        });

        isFormErred ||= nextField.errors.some(fieldError => fieldError.type !== 'server');

        return nextField;
      });

      isFormValidRef.current = !isFormErred;

      // Set the new `nextFormFields` value to the ref to access it at getting clean values at submitting
      formFieldsRef.current = nextFormFields;
      setFormFields(nextFormFields);

      await onAfterValidate?.({
        isFormErred,
        formContext: formContextRef.current,
        formFields: nextFormFields,
        formValues: getFormValues(nextFormFields),
        formErrors: getFormErrors(nextFormFields),
      });

      return !isFormErred;
    },
    [onAfterValidate],
  );

  /**
   * Validates the form fields, updating the form state to reflect validation progress and status.
   *
   * This function provides an outer wrapper around the internal `validateForm` function, adding
   * state management to signal when validation is in progress (`isValidating`).
   *
   * @param [validateOptions] - Optional validate options.
   *
   * @returns A promise that resolves to `true` if all validations pass (i.e., no errors),
   *  or `false` if any validation errors are found.
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
      formFieldsRef,
      formDefaultsRef,
      setFieldValue,
      clearFieldErrors,
      validateField,
      pushFieldValue,
      removeFieldValue,
      addFormFieldErrors,
      formContext: formContextRef.current,
    });

  const resetForm = useCallback<HoneyFormReset<Form>>(newFormDefaults => {
    isFormDirtyRef.current = false;
    isFormValidRef.current = false;
    isFormSubmittedRef.current = false;

    // Abort all ongoing validation requests
    Object.values(formFieldsValidationControllerRef.current).forEach(controller =>
      controller.abort(),
    );

    formFieldsValidationControllerRef.current = {};

    if (newFormDefaults) {
      formDefaultsRef.current = { ...formDefaultsRef.current, ...newFormDefaults };
    }

    setFormFields(getInitialFormFieldsState);

    if (parentField) {
      parentField.validate();
    }
  }, []);

  const restoreUnfinishedForm = useCallback<HoneyFormRestoreUnfinishedForm>(() => {
    isUnfinishedFormDetected.current = false;

    // TODO: restoring saved form values
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

          const submitData = getSubmitFormValues(
            parentField,
            formContextRef.current,
            formFieldsRef.current,
          );

          const submitHandler = formSubmitHandler || onSubmit;

          const serverErrors = await submitHandler(submitData, { formContext });

          if (serverErrors && Object.keys(serverErrors).length) {
            setFormErrors(
              convertServerErrors(serverErrors, (_, fieldErrors) =>
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
    if (isFunction(defaults)) {
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
    // Functions
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
