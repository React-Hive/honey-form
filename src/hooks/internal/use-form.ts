import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { assert, invokeIfFunction } from '@react-hive/honey-utils';

import { HONEY_FORM_ERRORS } from '../../constants';
import {
  createFormField,
  executeFieldValidator,
  executeFieldValidatorAsync,
  getNextErredField,
  getNextFieldsState,
  getNextErrorsFreeField,
  getNextFormFieldState,
  getNextAsyncValidatedField,
  processSkippableFields,
  resetAllFields,
  resetDependentFields,
} from '../../field';
import {
  warning,
  isInteractiveField,
  isNestedFormsField,
  forEachFormError,
  getFormErrors,
  getFormValues,
  getFormSubmitValues,
  isSkipField,
  iterateFormFields,
  convertServerErrors,
  runChildFormsValidation,
  mapFormFieldsAsync,
  saveFormToStorage,
  removeFormFromLs,
} from '../../helpers';
import { useFormDefaults } from './use-form-defaults';
import { useUnsubmittedForm } from './use-unsubmitted-form';
import type {
  Nullable,
  KeysWithArrayValues,
  FormOptions,
  HoneyFormState,
  HoneyFormBaseForm,
  HoneyFormFieldAddError,
  HoneyFormFieldClearErrors,
  HoneyFormFields,
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
  HoneyFormFieldsValidationController,
  HoneyFormBaseExecutionContext,
  HoneyFormField,
  HoneyFormServerErrors,
} from '../../types';

const FORM_DEFAULTS = {};

const INITIAL_FORM_STATE: HoneyFormState = {
  isValidating: false,
  isSubmitting: false,
};

export const useForm = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  Form extends HoneyFormBaseForm,
  FormContext = undefined,
>({
  initialFormFieldsStateResolver,
  mode = 'change',
  fields,
  name: formName,
  parentField,
  defaults = FORM_DEFAULTS,
  readDefaultsFromStorage = false,
  refetchDefaultsOnContextChange = true,
  values: externalValues,
  validateValues: validateExternalValues = true,
  skipSyncDirtyFields = false,
  resetAfterSubmit = false,
  alwaysValidateParentField = false,
  storage,
  context: formContext,
  onAfterValidate,
  onSubmit,
  onChange,
  onChangeDebounce,
}: FormOptions<ParentForm, ParentFieldName, Form, FormContext>) => {
  assert(
    !storage || formName,
    '[@react-hive/honey-form]: The form name is required when any form data storage is used',
  );

  const formId = useId();

  const [formState, setFormState] = useState<HoneyFormState>(INITIAL_FORM_STATE);

  const formContextRef = useRef<FormContext>(formContext);
  formContextRef.current = formContext;

  const formFieldsRef = useRef<Nullable<HoneyFormFields<Form, FormContext>>>(null);
  const formValuesRef = useRef<Nullable<Form>>(null);
  const formSubmitValuesRef = useRef<Nullable<Form>>(null);
  const formErrorsRef = useRef<Nullable<HoneyFormErrors<Form>>>(null);
  const formFieldsValidationControllerRef = useRef<HoneyFormFieldsValidationController<Form>>({});
  const isFormDirtyRef = useRef(false);
  const isFormValidRef = useRef(false);
  const isFormSubmittedRef = useRef(false);
  const totalFormSubmissionsRef = useRef(0);
  const onChangeFormTimeoutIdRef = useRef<Nullable<number>>(null);
  const onChangeFieldsTimeoutIdRef = useRef<Record<keyof Form, Nullable<number>>>({} as never);

  const updateFormState = useCallback((newFormState: Partial<HoneyFormState>) => {
    setFormState(prevFormState => ({ ...prevFormState, ...newFormState }));
  }, []);

  const resolveFormFields = (): HoneyFormFields<Form, FormContext> => {
    const formFields = formFieldsRef.current;
    assert(formFields, HONEY_FORM_ERRORS.emptyFormFieldsRef);

    return formFields;
  };

  /**
   * Processes form field changes with optional debouncing.
   *
   * This function updates form fields and, if applicable, delays invoking the `onChange` callback
   * using a debouncing mechanism. It also handles query string synchronization if `storage` is set to `'qs'`.
   *
   * @param initiatorFieldName - The name of the field that triggered the change. Used to determine
   *                             a custom-debounced delay `onChangeDebounce` if configured.
   * @param fn - A function that returns the updated form fields after processing the change.
   * @param shouldSkipOnChange - If `true`, applies the changes immediately without debouncing.
   *
   * @returns The updated form fields.
   */
  const formChangeProcessor = (
    initiatorFieldName: Nullable<keyof Form>,
    fn: () => HoneyFormFields<Form, FormContext>,
    shouldSkipOnChange = false,
  ): HoneyFormFields<Form, FormContext> => {
    const nextFormFields = fn();

    if (!parentField) {
      if (storage) {
        const submitValues = getFormSubmitValues(
          parentField,
          formContextRef.current,
          nextFormFields,
        );

        saveFormToStorage(storage, fields, formName, submitValues);
      }
    }

    if (shouldSkipOnChange || !onChange) {
      return nextFormFields;
    }

    if (onChangeFormTimeoutIdRef.current) {
      clearTimeout(onChangeFormTimeoutIdRef.current);
    }

    const initiateOnChange = () => {
      const submitValues = getFormSubmitValues(parentField, formContextRef.current, nextFormFields);

      const formValues = getFormValues(nextFormFields);

      const executionContext: HoneyFormBaseExecutionContext<Form, FormContext> = {
        formValues,
        formFields: nextFormFields,
        formContext: formContextRef.current,
      };

      const formErrors = getFormErrors(nextFormFields);

      onChange(submitValues, {
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
    if (!fieldConfig.onChange) {
      return nextFormFields;
    }

    const initiateOnChange = () => {
      const formValues = getFormValues(nextFormFields);

      const normalizedValue = isNestedFormsField(fieldConfig)
        ? (nextFormFields[fieldName].getChildFormsValues() as Form[typeof fieldName])
        : nextFormFields[fieldName].normalizedValue;

      fieldConfig.onChange(normalizedValue, {
        formValues,
        formContext: formContextRef.current,
        formFields: nextFormFields,
      });
    };

    onChangeFieldsTimeoutIdRef.current[fieldName] = window.setTimeout(() => {
      onChangeFieldsTimeoutIdRef.current[fieldName] = null;

      initiateOnChange();
    }, fieldConfig.onChangeDebounce ?? 0);

    return nextFormFields;
  };

  const setFormValues = useCallback<HoneyFormSetFormValues<Form>>(
    (
      targetValues,
      {
        validate = true,
        updateDirtyValues = true,
        dirty = true,
        clearAll = false,
        skipOnChange = false,
        skipResetDependentFields = false,
      } = {},
    ) => {
      const formFields = resolveFormFields();

      if (dirty) {
        isFormDirtyRef.current = true;
      }

      const nextFormFields = formChangeProcessor(
        null,
        () => {
          let nextFormFields = { ...formFields };

          if (clearAll) {
            nextFormFields = resetAllFields(nextFormFields);
          }

          let formValues = getFormValues(nextFormFields);

          Object.keys(targetValues).forEach((fieldName: keyof Form) => {
            assert(
              fieldName in nextFormFields,
              `[@react-hive/honey-form]: Attempted to set value for non-existent field "${fieldName.toString()}"`,
            );

            if (!updateDirtyValues && nextFormFields[fieldName].isDirty) {
              return;
            }

            const fieldConfig = nextFormFields[fieldName].config;

            if (!skipResetDependentFields) {
              nextFormFields = resetDependentFields(
                {
                  formValues,
                  formContext: formContextRef.current,
                  formFields: nextFormFields,
                },
                fieldName,
              );
            }

            const executionContext: HoneyFormBaseExecutionContext<Form, FormContext> = {
              formValues,
              formContext: formContextRef.current,
              formFields: nextFormFields,
            };

            const filteredValue =
              isInteractiveField(fieldConfig) && fieldConfig.filter
                ? fieldConfig.filter(targetValues[fieldName], executionContext)
                : targetValues[fieldName];

            const nextFormField: HoneyFormField<Form, keyof Form, FormContext> = validate
              ? executeFieldValidator({
                  executionContext,
                  formFieldsValidationControllerRef,
                  fieldName,
                  fieldValue: filteredValue,
                  finishFieldAsyncValidation,
                })
              : getNextErrorsFreeField(nextFormFields[fieldName]);

            nextFormFields[fieldName] = getNextFormFieldState(nextFormField, filteredValue, {
              executionContext,
              shouldFormat: true,
            });
          });

          formValues = getFormValues(nextFormFields);

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
        skipOnChange,
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
    const formFields = resolveFormFields();

    const nextFormFields = { ...formFields };

    forEachFormError(formErrors, (fieldName, fieldErrors) => {
      if (fieldName in nextFormFields) {
        nextFormFields[fieldName] = getNextErredField(nextFormFields[fieldName], fieldErrors);
      } else {
        warning(`Attempted to set errors for unknown field "${fieldName.toString()}"`);
      }
    });

    formFieldsRef.current = nextFormFields;
    setFormFields(nextFormFields);
  }, []);

  const clearFormErrors = useCallback<HoneyFormClearErrors>(() => {
    const formFields = resolveFormFields();

    const nextFormFields = iterateFormFields(formFields, (_, formField) =>
      getNextErrorsFreeField(formField),
    ) as unknown as HoneyFormFields<Form, FormContext>;

    formFieldsRef.current = nextFormFields;
    setFormFields(nextFormFields);
  }, []);

  const finishFieldAsyncValidation: HoneyFormFieldFinishAsyncValidation<Form> = fieldName => {
    const formFields = resolveFormFields();

    const nextFormFields: HoneyFormFields<Form, FormContext> = {
      ...formFields,
      [fieldName]: getNextAsyncValidatedField(formFields[fieldName]),
    };

    formFieldsRef.current = nextFormFields;
    setFormFields(nextFormFields);
  };

  const setFieldValue: HoneyFormFieldSetValueInternal<Form> = (
    fieldName,
    fieldValue,
    options = {},
  ) => {
    const {
      validate = true,
      dirty = true,
      format = true,
      shouldSetChildFormsValues = true,
    } = options;

    const formFields = resolveFormFields();

    // Any new field value clears the next form states
    isFormValidRef.current = false;
    isFormSubmittedRef.current = false;

    if (dirty) {
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
        // Validation is deferred when the field's mode is `submit` (validation will only happen on form submission)
        const isValidateOnSubmit = formField.config.mode === 'submit';

        const shouldValidateField = !isValidateOnSubmit && (validate || isFieldPreviouslyErred);

        const nextFormFields = getNextFieldsState(fieldName, fieldValue, {
          executionContext,
          formFieldsValidationControllerRef,
          parentField,
          format,
          // Apply the new default value within the same update, so `isDirty` is computed against it
          ...('defaultValue' in options && {
            defaultValue: options.defaultValue,
          }),
          validate: shouldValidateField,
          finishFieldAsyncValidation,
        });

        if (parentField) {
          const isFieldCurrentlyErred = nextFormFields[fieldName].errors.length > 0;

          if (alwaysValidateParentField || isFieldPreviouslyErred || isFieldCurrentlyErred) {
            // Use a timeout to avoid rendering the parent form during this field's render cycle
            setTimeout(() => {
              parentField.validate();
            }, 0);
          }
        }

        if (shouldSetChildFormsValues) {
          const fieldConfig = nextFormFields[fieldName].config;

          if (isNestedFormsField(fieldConfig)) {
            const childForms = formField.__meta__.childForms ?? [];

            if (childForms.length) {
              assert(
                Array.isArray(fieldValue),
                '[@react-hive/honey-form]: Expected field value to be an array when setting values for child forms. Received type: ' +
                  typeof fieldValue,
              );

              assert(
                childForms.length === fieldValue.length,
                `[@react-hive/honey-form]: Mismatched length. The number of child forms "${childForms.length}" must match the length of "${fieldValue.length}".`,
              );

              childForms.forEach((childForm, childFormIndex) => {
                childForm.setFormValues(fieldValue[childFormIndex], {
                  validate: shouldValidateField,
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
    const formFields = resolveFormFields();

    const nextFormFields: HoneyFormFields<Form, FormContext> = {
      ...formFields,
      [fieldName]: getNextErrorsFreeField(formFields[fieldName]),
    };

    formFieldsRef.current = nextFormFields;
    setFormFields(nextFormFields);
  };

  const pushFieldValue: HoneyFormFieldPushValue<Form> = (fieldName, value) => {
    const formFields = resolveFormFields();

    setFieldValue(
      fieldName,
      [...(formFields[fieldName].displayValue as []), value] as Form[typeof fieldName],
      {
        shouldSetChildFormsValues: false,
      },
    );
  };

  /**
   * Removes a value from a specific form field that holds an array of values.
   */
  const removeFieldValue: HoneyFormFieldRemoveValue<Form> = (fieldName, formIndex) => {
    const formFields = resolveFormFields();

    const fieldValue = formFields[fieldName]
      .getChildFormsValues()
      .filter((_, index) => index !== formIndex) as Form[typeof fieldName];

    setFieldValue(fieldName, fieldValue, {
      shouldSetChildFormsValues: false,
    });
  };

  const validateField: HoneyFormValidateField<Form> = fieldName => {
    const formFields = resolveFormFields();
    const formValues = getFormValues(formFields);

    const executionContext: HoneyFormBaseExecutionContext<Form, FormContext> = {
      formFields,
      formValues,
      formContext: formContextRef.current,
    };

    const formField = formFields[fieldName];

    const isFieldPreviouslyErred = formField.errors.length > 0;

    let filteredValue: Form[typeof fieldName];

    if (isInteractiveField(formField.config)) {
      filteredValue = formField.config.filter
        ? formField.config.filter(formField.rawValue, executionContext)
        : formField.rawValue;
      //
    } else if (isNestedFormsField(formField.config)) {
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

    const nextFormFields: HoneyFormFields<Form, FormContext> = {
      ...formFields,
      [fieldName]: nextFormField,
    };

    if (parentField) {
      const isFieldCurrentlyErred = nextFormFields[fieldName].errors.length > 0;

      if (alwaysValidateParentField || isFieldPreviouslyErred || isFieldCurrentlyErred) {
        // Use a timeout to avoid rendering the parent form during this field's render cycle
        setTimeout(() => {
          parentField.validate();
        }, 0);
      }
    }

    formFieldsRef.current = nextFormFields;
    setFormFields(nextFormFields);
  };

  const addFormFieldErrors = useCallback<HoneyFormFieldAddErrors<Form>>((fieldName, errors) => {
    const formFields = resolveFormFields();
    const formField = formFields[fieldName];

    const nextFormFields: HoneyFormFields<Form, FormContext> = {
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

  const { formDefaultsRef, isFormDefaultsFetching, isFormDefaultsFetchingErred } = useFormDefaults({
    defaults,
    formName,
    storage,
    fields,
    formContext: formContextRef.current,
    readFromStorage: readDefaultsFromStorage,
    refetchOnContextChange: refetchDefaultsOnContextChange,
    onFetchSucceed: values => {
      setFormValues(values, {
        validate: false,
        dirty: false,
        skipOnChange: true,
        skipResetDependentFields: true,
      });
    },
  });

  const { hasUnsubmittedForm, restoreUnsubmittedForm } = useUnsubmittedForm({
    formName,
    storage,
    fields,
    readDefaultsFromStorage,
    onRestore: values => {
      setFormValues(values);
    },
  });

  const addFormField = useCallback<HoneyFormAddFormField<Form, FormContext>>(
    (fieldName, fieldConfig) => {
      const formFields = resolveFormFields();
      if (fieldName in formFields) {
        warning(`Form field "${fieldName.toString()}" is already present`);
      }

      const executionContext: HoneyFormBaseExecutionContext<Form, FormContext> = {
        formFields,
        formContext: formContextRef.current,
        formValues: getFormValues(formFields),
      };

      const nextFormFields: HoneyFormFields<Form, FormContext> = {
        ...formFields,
        [fieldName]: createFormField(
          fieldName,
          fieldConfig,
          {
            executionContext,
            formFieldsRef,
            formDefaultsRef,
          },
          {
            setFieldValue,
            clearFieldErrors,
            validateField,
            pushFieldValue,
            removeFieldValue,
            addFormFieldErrors,
          },
        ),
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
    async ({ targetFields, excludeFields, shouldSetErrors = true } = {}) => {
      const formFields = resolveFormFields();

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

        if (isExcludeFieldFromValidation || !isTargetFieldValidation) {
          return formField;
        }

        if (
          isSkipField({
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

        const { nextField, fieldErrors } = await executeFieldValidatorAsync({
          executionContext,
          formFieldsValidationControllerRef,
          parentField,
          fieldName,
          shouldSetErrors,
        });

        isFormErred ||= fieldErrors.some(fieldError => fieldError.type !== 'server');

        return nextField;
      });

      isFormValidRef.current = !isFormErred;

      // Set the new `nextFormFields` value to the ref to access it at getting normalized values at submitting
      formFieldsRef.current = nextFormFields;
      setFormFields(nextFormFields);

      if (onAfterValidate) {
        await onAfterValidate({
          isFormErred,
          formContext: formContextRef.current,
          formFields: nextFormFields,
          formValues: getFormValues(nextFormFields),
          formErrors: getFormErrors(nextFormFields),
        });
      }

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
      formDefaultsRef.current = {
        ...formDefaultsRef.current,
        ...newFormDefaults,
      };
    }

    setFormFields(getInitialFormFieldsState);

    if (parentField) {
      parentField.validate();
    }

    if (formName && storage === 'ls') {
      removeFormFromLs(formName);
    }
  }, []);

  const setFormServerErrors = (serverErrors: HoneyFormServerErrors<Form>) => {
    if (Object.keys(serverErrors).length) {
      setFormErrors(
        convertServerErrors(serverErrors, (_, fieldErrors) =>
          fieldErrors.map(errorMsg => ({
            type: 'server',
            message: errorMsg,
          })),
        ),
      );
    }
  };

  const submitForm = useCallback<HoneyFormSubmit<Form, FormContext>>(
    async formSubmitHandler => {
      assert(formFieldsRef.current, HONEY_FORM_ERRORS.emptyFormFieldsRef);
      assert(formSubmitHandler || onSubmit, HONEY_FORM_ERRORS.submitHandlerOrOnSubmit);

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

          const submitValues = getFormSubmitValues(
            parentField,
            formContextRef.current,
            formFieldsRef.current,
          );

          const submitHandler = formSubmitHandler || onSubmit;

          const serverErrors = await submitHandler(submitValues, {
            formContext,
            setFormServerErrors,
          });

          if (serverErrors && Object.keys(serverErrors).length) {
            setFormServerErrors(serverErrors);
          } else {
            isFormDirtyRef.current = false;
            isFormSubmittedRef.current = true;

            if (resetAfterSubmit) {
              return resetForm();
            } else {
              if (formName && storage === 'ls') {
                removeFormFromLs(formName);
              }
            }
          }

          totalFormSubmissionsRef.current += 1;
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
        validate: validateExternalValues,
        updateDirtyValues: !skipSyncDirtyFields,
        dirty: false,
        skipOnChange: true,
        skipResetDependentFields: true,
      });
    }
  }, [externalValues, validateExternalValues, skipSyncDirtyFields]);

  const checkIsAnyFormFieldValidating = () =>
    Object.values(formFieldsRef.current).some(
      (field: HoneyFormField<Form, keyof Form>) => field.isValidating,
    );

  const formValues = useMemo(() => getFormValues(formFields), [formFields]);
  formValuesRef.current = formValues;

  const formSubmitValues = useMemo(
    () => getFormSubmitValues(parentField, formContext, formFields),
    [formContext, formFields],
  );
  formSubmitValuesRef.current = formSubmitValues;

  const formErrors = useMemo(() => getFormErrors(formFields), [formFields]);
  formErrorsRef.current = formErrors;

  return {
    formId,
    formContext,
    formFieldsRef,
    // Getters are needed to get the form fields, values and etc. using multi forms
    get formDefaultValues() {
      return Object.keys(formDefaultsRef.current).reduce(
        (formDefaults, fieldName) => ({
          ...formDefaults,
          [fieldName]: invokeIfFunction(formDefaultsRef.current[fieldName]),
        }),
        {} as Partial<Form>,
      );
    },
    get formFields() {
      return formFieldsRef.current;
    },
    get formValues() {
      return formValuesRef.current;
    },
    get formSubmitValues() {
      return formSubmitValuesRef.current;
    },
    get formErrors() {
      return formErrorsRef.current;
    },
    get totalFormSubmissions() {
      return totalFormSubmissionsRef.current;
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
    get isFormErred() {
      return Object.keys(formErrorsRef.current).length > 0;
    },
    get isFormSubmitAllowed() {
      const isAnyFieldValidating = checkIsAnyFormFieldValidating();

      return (
        !isFormDefaultsFetching &&
        !isFormDefaultsFetchingErred &&
        !isAnyFieldValidating &&
        !formState.isValidating &&
        !formState.isSubmitting
      );
    },
    get isAnyFormFieldValidating() {
      return checkIsAnyFormFieldValidating();
    },
    isFormDefaultsFetching,
    isFormDefaultsFetchingErred,
    hasUnsubmittedForm,
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
    restoreUnsubmittedForm,
  };
};
