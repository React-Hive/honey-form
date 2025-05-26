import React from 'react';

import type { HoneyFormBaseForm, KeysWithArrayValues } from '../types';
import type { ChildHoneyFormProviderProps } from './child-honey-form.provider';
import type { ChildHoneyFormFormProps, ChildHoneyFormFormContent } from './child-honey-form.form';

import { ChildHoneyFormProvider } from './child-honey-form.provider';
import { genericMemo } from '../helpers';
import { ChildHoneyFormForm } from './child-honey-form.form';

interface ChildHoneyFormProps<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext = undefined,
> extends ChildHoneyFormProviderProps<ParentForm, ParentFieldName, FormContext> {
  children?: ChildHoneyFormFormContent<ParentForm, ParentFieldName, FormContext>;
  formProps?: ChildHoneyFormFormProps<ParentForm, ParentFieldName, FormContext>;
}

const ChildHoneyFormComponent = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext = undefined,
>({
  children,
  formProps,
  ...props
}: ChildHoneyFormProps<ParentForm, ParentFieldName, FormContext>) => {
  return (
    <ChildHoneyFormProvider {...props}>
      <ChildHoneyFormForm {...formProps}>{children}</ChildHoneyFormForm>
    </ChildHoneyFormProvider>
  );
};

export const ChildHoneyForm = genericMemo(ChildHoneyFormComponent);
