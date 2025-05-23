import React, { createContext, useContext } from 'react';

import type { PropsWithChildren } from 'react';
import type {
  HoneyFormBaseForm,
  HoneyFormApi,
  ChildHoneyFormOptions,
  KeysWithArrayValues,
  HoneyFormExtractChildForm,
} from '../types';

import { useChildHoneyForm } from '../hooks';

type ChildHoneyFormContextValue<
  // TODO: pass ParentForm to ChildHoneyFormApi
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext = undefined,
  ChildForm extends HoneyFormExtractChildForm<
    ParentForm[ParentFieldName]
  > = HoneyFormExtractChildForm<ParentForm[ParentFieldName]>,
> = HoneyFormApi<ChildForm, FormContext>;

const ChildHoneyFormContext = createContext<
  ChildHoneyFormContextValue<any, any, any, any> | undefined
>(undefined);

export type ChildHoneyFormProviderProps<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext = undefined,
> = ChildHoneyFormOptions<ParentForm, ParentFieldName, FormContext>;

export const ChildHoneyFormProvider = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext = undefined,
>({
  children,
  ...props
}: PropsWithChildren<ChildHoneyFormProviderProps<ParentForm, ParentFieldName, FormContext>>) => {
  const childHoneyFormApi = useChildHoneyForm(props);

  return <ChildHoneyFormContext value={childHoneyFormApi}>{children}</ChildHoneyFormContext>;
};

export const useChildHoneyFormProvider = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext = undefined,
  ChildForm extends HoneyFormExtractChildForm<
    ParentForm[ParentFieldName]
  > = HoneyFormExtractChildForm<ParentForm[ParentFieldName]>,
>() => {
  const childFormContext = useContext<
    ChildHoneyFormContextValue<ParentForm, ParentFieldName, FormContext, ChildForm> | undefined
  >(ChildHoneyFormContext);

  if (!childFormContext) {
    throw new Error(
      '[honey-form]: The `useChildHoneyFormProvider()` can be used only inside <ChildHoneyFormProvider/> component!',
    );
  }

  return childFormContext;
};
