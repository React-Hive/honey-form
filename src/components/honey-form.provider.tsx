import type { ReactNode } from 'react';
import React, { createContext, useContext } from 'react';

import type { HoneyFormBaseForm, HoneyFormApi, HoneyFormOptions } from '../types';

import { isFunction } from '../helpers';
import { useHoneyForm } from '../hooks';

type HoneyFormContextValue<Form extends HoneyFormBaseForm, FormContext = undefined> = HoneyFormApi<
  Form,
  FormContext
>;

const HoneyFormContext = createContext<HoneyFormContextValue<any, any> | undefined>(undefined);

export type HoneyFormProviderProps<
  Form extends HoneyFormBaseForm,
  FormContext = undefined,
> = HoneyFormOptions<Form, FormContext> & {
  children?: ReactNode | ((honeyFormApi: HoneyFormApi<Form, FormContext>) => ReactNode);
};

export const HoneyFormProvider = <Form extends HoneyFormBaseForm, FormContext = undefined>({
  children,
  ...props
}: HoneyFormProviderProps<Form, FormContext>) => {
  const honeyFormApi = useHoneyForm(props);

  return (
    <HoneyFormContext value={honeyFormApi}>
      {isFunction(children) ? children(honeyFormApi) : children}
    </HoneyFormContext>
  );
};

export const useHoneyFormProvider = <Form extends HoneyFormBaseForm, FormContext = undefined>() => {
  const formContext = useContext<HoneyFormContextValue<Form, FormContext> | undefined>(
    HoneyFormContext,
  );

  if (!formContext) {
    throw new Error(
      '[honey-form]: The `useHoneyFormProvider()` can be used only inside <HoneyFormProvider/> component!',
    );
  }

  return formContext;
};
