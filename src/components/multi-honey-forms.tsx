import type { ReactNode } from 'react';
import React, { createContext, useContext, useMemo } from 'react';

import type { HoneyFormBaseForm, MultiHoneyFormOptions, MultiHoneyFormsApi } from '../types';
import { isFunction } from '../helpers';
import { useMultiHoneyForms } from '../hooks/use-multi-honey-forms';

export type MultiHoneyFormsContextValue<
  Form extends HoneyFormBaseForm,
  FormContext = undefined,
> = MultiHoneyFormsApi<Form, FormContext> & {
  disableFormsManagement: boolean;
};

export const MultiHoneyFormsContext = createContext<
  MultiHoneyFormsContextValue<any, any> | undefined
>(undefined);

type MultiHoneyFormsProps<
  Form extends HoneyFormBaseForm,
  FormContext = undefined,
> = MultiHoneyFormOptions<Form, FormContext> & {
  children?: ReactNode | ((multiHoneyFormsApi: MultiHoneyFormsApi<Form, FormContext>) => ReactNode);
  disableFormsManagement?: boolean;
};

export const MultiHoneyForms = <Form extends HoneyFormBaseForm, FormContext = undefined>({
  children,
  disableFormsManagement = false,
  ...multiFormsOptions
}: MultiHoneyFormsProps<Form, FormContext>) => {
  const multiHoneyFormsApi = useMultiHoneyForms<Form, FormContext>(multiFormsOptions);

  const contextValue = useMemo(
    () => ({
      ...multiHoneyFormsApi,
      disableFormsManagement,
    }),
    [multiHoneyFormsApi, disableFormsManagement],
  );

  return (
    <MultiHoneyFormsContext.Provider value={contextValue}>
      {isFunction(children) ? children(multiHoneyFormsApi) : children}
    </MultiHoneyFormsContext.Provider>
  );
};

export const useMultiHoneyFormsProvider = <
  Form extends HoneyFormBaseForm,
  FormContext = undefined,
>() => {
  const multiFormsContext = useContext<MultiHoneyFormsContextValue<Form, FormContext> | undefined>(
    MultiHoneyFormsContext,
  );

  if (!multiFormsContext) {
    throw new Error(
      '[honey-form]: The `useMultiHoneyFormsProvider()` can be used only inside <MultiHoneyFormsProvider/> component!',
    );
  }

  return multiFormsContext;
};
