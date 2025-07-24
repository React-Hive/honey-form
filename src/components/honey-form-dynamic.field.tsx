import { useEffect } from 'react';

import type { ReactNode } from 'react';
import type { HoneyFormField, HoneyFormFieldConfig, HoneyFormBaseForm } from '../types';

import { useHoneyFormContext } from './honey-form.provider';

type HoneyFormDynamicFieldProps<
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName],
> = HoneyFormFieldConfig<Form, FieldName, FormContext, FieldValue> & {
  name: FieldName;
  children: (field: HoneyFormField<Form, FieldName, FormContext, FieldValue>) => ReactNode;
};

export const HoneyFormDynamicField = <
  Form extends HoneyFormBaseForm,
  FieldName extends keyof Form,
  FormContext,
  FieldValue extends Form[FieldName],
>({
  children,
  name,
  ...props
}: HoneyFormDynamicFieldProps<Form, FieldName, FormContext, FieldValue>) => {
  const { formFields, addFormField, removeFormField } = useHoneyFormContext<Form, FormContext>();

  useEffect(() => {
    addFormField(name, props);

    return () => {
      removeFormField(name);
    };
  }, []);

  const field = formFields[name];
  if (!field) {
    return null;
  }

  // @ts-expect-error
  return children(field);
};
