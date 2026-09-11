import { useContext, useEffect } from 'react';
import { noop } from '@react-hive/honey-utils';

import { createFormField } from '../field';
import { useForm } from './internal';
import { getFormValues, mapFieldsConfig } from '../helpers';
import { MultiHoneyFormsContext } from '../components';
import type {
  InitialFormFieldsStateResolverOptions,
  HoneyFormBaseExecutionContext,
  HoneyFormBaseForm,
  HoneyFormOptions,
  HoneyFormFieldsConfig,
  HoneyFormApi,
} from '../types';
import type { MultiHoneyFormsContextValue } from '../components';

interface CreateInitialFormFieldsOptions<
  Form extends HoneyFormBaseForm,
  FormContext,
> extends InitialFormFieldsStateResolverOptions<Form, FormContext> {
  fieldsConfig: HoneyFormFieldsConfig<Form, FormContext>;
}

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
  const executionContext: HoneyFormBaseExecutionContext<Form, FormContext> = {
    formContext,
    formFields: formFieldsRef.current,
    formValues: getFormValues(formFieldsRef.current),
  };

  return mapFieldsConfig(fieldsConfig, (fieldName, fieldConfig) =>
    createFormField(
      fieldName,
      {
        ...fieldConfig,
        defaultValue:
          fieldName in formDefaultsRef.current
            ? formDefaultsRef.current[fieldName]
            : fieldConfig.defaultValue,
      },
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
  );
};

export const useHoneyForm = <Form extends HoneyFormBaseForm, FormContext = undefined>({
  fields: fieldsConfig = {} as never,
  ...options
}: HoneyFormOptions<Form, FormContext>): HoneyFormApi<Form, FormContext> => {
  const multiFormsContext = useContext<MultiHoneyFormsContextValue<Form, FormContext> | undefined>(
    MultiHoneyFormsContext,
  );

  const formApi = useForm<never, never, Form, FormContext>({
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
