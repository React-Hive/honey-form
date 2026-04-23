import React, { createContext, useContext } from 'react';
import { assert, invokeIfFunction } from '@react-hive/honey-utils';
import type { ReactNode } from 'react';

import type { HoneyFormBaseForm, HoneyFormApi, HoneyFormOptions } from '../types';

import { useHoneyForm } from '../hooks';

type HoneyFormContextValue<Form extends HoneyFormBaseForm, FormContext = undefined> = HoneyFormApi<
  Form,
  FormContext
>;

const HoneyFormContext = createContext<HoneyFormContextValue<any, any> | undefined>(undefined);

export interface HoneyFormProviderProps<
  Form extends HoneyFormBaseForm,
  FormContext = undefined,
> extends HoneyFormOptions<Form, FormContext> {
  children?: ReactNode | ((honeyFormApi: HoneyFormApi<Form, FormContext>) => ReactNode);
}

export const HoneyFormProvider = <Form extends HoneyFormBaseForm, FormContext = undefined>({
  children,
  ...props
}: HoneyFormProviderProps<Form, FormContext>) => {
  const honeyFormApi = useHoneyForm(props);

  return (
    <HoneyFormContext value={honeyFormApi}>
      {invokeIfFunction(children, honeyFormApi)}
    </HoneyFormContext>
  );
};

export const useHoneyFormContext = <Form extends HoneyFormBaseForm, FormContext = undefined>() => {
  const formContext = useContext<HoneyFormContextValue<Form, FormContext> | undefined>(
    HoneyFormContext,
  );

  assert(
    formContext,
    '[@react-hive/honey-form]: The `useHoneyFormContext()` can be used only inside <HoneyFormProvider/> component!',
  );

  return formContext;
};
