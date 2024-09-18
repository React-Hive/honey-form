import { useContext, useEffect } from 'react';

import type {
  HoneyFormBaseForm,
  HoneyFormOptions,
  HoneyFormFieldsConfig,
  HoneyFormApi,
  InitialFormFieldsStateResolverOptions,
} from '../types';
import type { MultiHoneyFormsContextValue } from '../components/multi-honey-forms';

import { createField } from '../field';
import { useBaseHoneyForm } from './use-base-honey-form';
import { mapFieldsConfig, noop } from '../helpers';
import { MultiHoneyFormsContext } from '../components/multi-honey-forms';

type CreateInitialFormFieldsOptions<
  Form extends HoneyFormBaseForm,
  FormContext,
> = InitialFormFieldsStateResolverOptions<Form, FormContext> & {
  fieldsConfig: HoneyFormFieldsConfig<Form, FormContext>;
};

const createInitialFormFields = <Form extends HoneyFormBaseForm, FormContext>({
  formContext,
  fieldsConfig,
  formFieldsRef,
  formDefaultsRef,
  setFieldValue,
  clearFieldErrors,
  validateField,
  pushFieldValue,
  removeFieldValue,
  addFormFieldErrors,
}: CreateInitialFormFieldsOptions<Form, FormContext>) => {
  const formFields = mapFieldsConfig(fieldsConfig, (fieldName, fieldConfig) =>
    createField(
      fieldName,
      {
        ...fieldConfig,
        defaultValue: formDefaultsRef.current[fieldName] ?? fieldConfig.defaultValue,
      },
      {
        formContext,
        formFieldsRef,
        formDefaultsRef,
        setFieldValue,
        clearFieldErrors,
        validateField,
        pushFieldValue,
        removeFieldValue,
        addFormFieldErrors,
      },
    ),
  );

  return formFields;
};

export const useHoneyForm = <Form extends HoneyFormBaseForm, FormContext = undefined>({
  fields: fieldsConfig = {} as never,
  ...options
}: HoneyFormOptions<Form, FormContext>): HoneyFormApi<Form, FormContext> => {
  const multiFormsContext = useContext<MultiHoneyFormsContextValue<Form, FormContext> | undefined>(
    MultiHoneyFormsContext,
  );

  const formApi = useBaseHoneyForm<never, never, Form, FormContext>({
    initialFormFieldsStateResolver: config => createInitialFormFields({ fieldsConfig, ...config }),
    fields: fieldsConfig,
    ...options,
  });

  useEffect(() => {
    if (!multiFormsContext || multiFormsContext.disableFormsManagement) {
      return noop;
    }
    // Add this form to multi forms context if present
    multiFormsContext.addForm(formApi);

    return () => {
      multiFormsContext.removeForm(formApi);
    };
  }, []);

  return formApi;
};
