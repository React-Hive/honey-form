import React from 'react';
import { invokeIfFunction } from '@react-hive/honey-utils';
import type { FormEventHandler, FormHTMLAttributes, ReactNode, RefAttributes } from 'react';

import { error } from '../helpers';
import { useHoneyFormContext } from './honey-form.provider';
import type { HoneyFormBaseForm, HoneyFormApi } from '../types';

export type HoneyFormFormContent<Form extends HoneyFormBaseForm, FormContext = undefined> =
  | ReactNode
  | ((honeyFormApi: HoneyFormApi<Form, FormContext>) => ReactNode);

export interface HoneyFormFormProps<Form extends HoneyFormBaseForm, FormContext = undefined>
  extends RefAttributes<HTMLFormElement>,
    Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'children'> {
  children?: HoneyFormFormContent<Form, FormContext>;
}

export const HoneyFormForm = <Form extends HoneyFormBaseForm, FormContext = undefined>({
  children,
  ...props
}: HoneyFormFormProps<Form, FormContext>) => {
  const honeyFormApi = useHoneyFormContext<Form, FormContext>();

  const onSubmit: FormEventHandler<HTMLFormElement> = e => {
    e.preventDefault();

    honeyFormApi.submitForm().catch(error);
  };

  const isFormBusy =
    honeyFormApi.isFormValidating ||
    honeyFormApi.isFormSubmitting ||
    honeyFormApi.isFormDefaultsFetching;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      // ARIA
      aria-busy={isFormBusy}
      // Data
      data-testid="honey-form"
      {...props}
    >
      {invokeIfFunction(children, honeyFormApi)}
    </form>
  );
};
