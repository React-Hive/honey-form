import React, { forwardRef } from 'react';

import type { Ref, FormEventHandler, FormHTMLAttributes, ReactNode } from 'react';
import type { HoneyFormBaseForm, HoneyFormApi } from '../types';

import { errorMessage, isFunction } from '../helpers';
import { useHoneyFormProvider } from './honey-form.provider';

export type HoneyFormFormContent<Form extends HoneyFormBaseForm, FormContext = undefined> =
  | ReactNode
  | ((honeyFormApi: HoneyFormApi<Form, FormContext>) => ReactNode);

export type HoneyFormFormProps<Form extends HoneyFormBaseForm, FormContext = undefined> = Omit<
  FormHTMLAttributes<HTMLFormElement>,
  'onSubmit' | 'children'
> & {
  children?: HoneyFormFormContent<Form, FormContext>;
};

const HoneyFormComponent = <Form extends HoneyFormBaseForm, FormContext = undefined>(
  { children, ...props }: HoneyFormFormProps<Form, FormContext>,
  ref: Ref<HTMLFormElement>,
) => {
  const honeyFormApi = useHoneyFormProvider<Form, FormContext>();

  const onSubmit: FormEventHandler<HTMLFormElement> = e => {
    e.preventDefault();

    honeyFormApi.submitForm().catch(errorMessage);
  };

  return (
    <form
      ref={ref}
      onSubmit={onSubmit}
      aria-busy={
        honeyFormApi.isFormValidating ||
        honeyFormApi.isFormSubmitting ||
        honeyFormApi.isFormDefaultsFetching
      }
      data-testid="honey-form"
      noValidate
      {...props}
    >
      {isFunction(children) ? children(honeyFormApi) : children}
    </form>
  );
};

export const HoneyFormForm = forwardRef(HoneyFormComponent) as <
  Form extends HoneyFormBaseForm,
  FormContext = undefined,
>(
  props: HoneyFormFormProps<Form, FormContext> & React.RefAttributes<HTMLFormElement>,
) => React.ReactElement;
