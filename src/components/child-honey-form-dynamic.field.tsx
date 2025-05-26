import React, { useEffect } from 'react';

import type { ReactNode } from 'react';
import type {
  HoneyFormField,
  HoneyFormBaseForm,
  ChildHoneyFormFieldConfig,
  KeysWithArrayValues,
  HoneyFormExtractChildForm,
} from '../types';

import { useChildHoneyFormContext } from './child-honey-form.provider';

type ChildHoneyFormDynamicFieldProps<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FieldName extends keyof ChildForm,
  FormContext,
  ChildForm extends HoneyFormExtractChildForm<
    ParentForm[ParentFieldName]
  > = HoneyFormExtractChildForm<ParentForm[ParentFieldName]>,
> = ChildHoneyFormFieldConfig<ParentForm, ParentFieldName, FieldName, FormContext, ChildForm> & {
  name: FieldName;
  children: (field: HoneyFormField<ChildForm, FieldName, FormContext>) => ReactNode;
};

export const ChildHoneyFormDynamicField = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FieldName extends keyof ChildForm,
  FormContext,
  ChildForm extends HoneyFormExtractChildForm<
    ParentForm[ParentFieldName]
  > = HoneyFormExtractChildForm<ParentForm[ParentFieldName]>,
>({
  children,
  name,
  ...props
}: ChildHoneyFormDynamicFieldProps<
  ParentForm,
  ParentFieldName,
  FieldName,
  FormContext,
  ChildForm
>) => {
  const { formFields, addFormField, removeFormField } = useChildHoneyFormContext<
    ParentForm,
    ParentFieldName,
    FormContext,
    ChildForm
  >();

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

  return <>{children(field)}</>;
};
