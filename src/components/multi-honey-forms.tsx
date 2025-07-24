import React, { createContext, useContext, useMemo } from 'react';
import { assert, invokeIfFunction } from '@react-hive/honey-utils';
import type { ReactNode } from 'react';

import { useMultiHoneyForms } from '../hooks';
import type { HoneyFormBaseForm, MultiHoneyFormOptions, MultiHoneyFormsApi } from '../types';

export interface MultiHoneyFormsContextValue<
  Form extends HoneyFormBaseForm,
  FormContext = undefined,
> extends MultiHoneyFormsApi<Form, FormContext> {
  disableFormsManagement: boolean;
}

export const MultiHoneyFormsContext = createContext<
  MultiHoneyFormsContextValue<any, any> | undefined
>(undefined);

interface MultiHoneyFormsProps<Form extends HoneyFormBaseForm, FormContext = undefined>
  extends MultiHoneyFormOptions<Form, FormContext> {
  children?: ReactNode | ((multiHoneyFormsApi: MultiHoneyFormsApi<Form, FormContext>) => ReactNode);
  disableFormsManagement?: boolean;
}

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
    <MultiHoneyFormsContext value={contextValue}>
      {invokeIfFunction(children, multiHoneyFormsApi)}
    </MultiHoneyFormsContext>
  );
};

export const useMultiHoneyFormsContext = <
  Form extends HoneyFormBaseForm,
  FormContext = undefined,
>() => {
  const multiFormsContext = useContext<MultiHoneyFormsContextValue<Form, FormContext> | undefined>(
    MultiHoneyFormsContext,
  );

  assert(
    multiFormsContext,
    '[honey-form]: The `useMultiHoneyFormsContext()` can be used only inside <MultiHoneyForms/> component!',
  );

  return multiFormsContext;
};
