import { useEffect } from 'react';
import type {
  Nullable,
  HoneyFormApi,
  HoneyFormBaseForm,
  HoneyFormParentField,
  HoneyFormFieldsConfig,
  HoneyFormExtractChildForm,
  ChildHoneyFormOptions,
  InitialFormFieldsStateResolverOptions,
  KeysWithArrayValues,
} from '../types';
import { registerChildForm, mapFieldsConfig, unregisterChildForm, getFormValues } from '../helpers';

import { useBaseHoneyForm } from './use-base-honey-form';
import { createFormField } from '../field';

interface CreateInitialFormFieldsOptions<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext,
  ChildForm extends HoneyFormExtractChildForm<ParentForm[ParentFieldName]>,
> extends InitialFormFieldsStateResolverOptions<ChildForm, FormContext> {
  formIndex: number | undefined;
  parentField: HoneyFormParentField<ParentForm, ParentFieldName> | undefined;
  fieldsConfig: HoneyFormFieldsConfig<ChildForm, FormContext>;
}

const createInitialFormFields = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext,
  ChildForm extends HoneyFormExtractChildForm<ParentForm[ParentFieldName]>,
>({
  formContext,
  formIndex,
  parentField,
  fieldsConfig,
  formFieldsRef,
  formDefaultsRef,
  setFieldValue,
  clearFieldErrors,
  validateField,
  pushFieldValue,
  removeFieldValue,
  addFormFieldErrors,
}: CreateInitialFormFieldsOptions<ParentForm, ParentFieldName, FormContext, ChildForm>) => {
  const formFields = mapFieldsConfig(fieldsConfig, (fieldName, fieldConfig) => {
    let childFormFieldValue: Nullable<ChildForm[keyof ChildForm] | undefined> = null;

    if (formIndex !== undefined && parentField) {
      const childForm = Array.isArray(parentField.value)
        ? (parentField.value[formIndex] as ChildForm)
        : parentField.value;

      // @ts-expect-error
      childFormFieldValue = childForm?.[fieldName];
    }

    return createFormField(
      fieldName,
      {
        ...fieldConfig,
        defaultValue:
          childFormFieldValue ?? formDefaultsRef.current[fieldName] ?? fieldConfig.defaultValue,
      },
      {
        formFieldsRef,
        formDefaultsRef,
        setFieldValue,
        clearFieldErrors,
        validateField,
        pushFieldValue,
        removeFieldValue,
        addFormFieldErrors,
        executionContext: {
          formContext,
          formFields: formFieldsRef.current,
          formValues: getFormValues(formFieldsRef.current),
        },
      },
    );
  });

  return formFields;
};

/**
 * Hook for managing a child form within a parent form. This hook integrates with the parent form and allows for the
 * creation and validation of nested forms.
 *
 * @param options - Options for the child form hook.
 *
 * @returns The API for interacting with the child form.
 */
export const useChildHoneyForm = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext = undefined,
  ChildForm extends HoneyFormExtractChildForm<
    ParentForm[ParentFieldName]
  > = HoneyFormExtractChildForm<ParentForm[ParentFieldName]>,
>({
  formIndex,
  parentField,
  fields: fieldsConfig = {} as never,
  ...options
}: ChildHoneyFormOptions<ParentForm, ParentFieldName, FormContext>): HoneyFormApi<
  ChildForm,
  FormContext
> => {
  const childFormApi = useBaseHoneyForm<ParentForm, ParentFieldName, ChildForm, FormContext>({
    parentField,
    fieldsConfig,
    initialFormFieldsStateResolver: config =>
      // @ts-expect-error
      createInitialFormFields({
        formIndex,
        parentField,
        fieldsConfig,
        ...config,
      }),
    ...options,
  });

  const { formId, formFieldsRef, submitForm, setFormValues, validateForm } = childFormApi;

  useEffect(() => {
    if (parentField) {
      registerChildForm(parentField, {
        formId,
        formFieldsRef,
        submitForm,
        validateForm,
        setFormValues,
      });
    }

    return () => {
      if (parentField) {
        unregisterChildForm(parentField, formId);
      }
    };
  }, []);

  return childFormApi;
};
