import React from 'react';
import type { RefAttributes } from 'react';

import { HoneyFormProvider } from './honey-form.provider';
import { HoneyFormForm } from './honey-form.form';
import { genericMemo } from '../helpers';
import type { HoneyFormBaseForm } from '../types';
import type { HoneyFormProviderProps } from './honey-form.provider';
import type { HoneyFormFormProps, HoneyFormFormContent } from './honey-form.form';

export interface HoneyFormProps<Form extends HoneyFormBaseForm, FormContext = undefined>
  extends RefAttributes<HTMLFormElement>,
    HoneyFormProviderProps<Form, FormContext> {
  children?: HoneyFormFormContent<Form, FormContext>;
  formProps?: HoneyFormFormProps<Form, FormContext>;
}

const HoneyFormComponent = <Form extends HoneyFormBaseForm, FormContext = undefined>({
  ref,
  children,
  formProps,
  ...props
}: HoneyFormProps<Form, FormContext>) => {
  return (
    <HoneyFormProvider {...props}>
      <HoneyFormForm ref={ref} {...formProps}>
        {children}
      </HoneyFormForm>
    </HoneyFormProvider>
  );
};

export const HoneyForm = genericMemo(HoneyFormComponent);
