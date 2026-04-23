import React, { createContext, useContext } from 'react';
import { assert } from '@react-hive/honey-utils';
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
  ChildForm extends HoneyFormExtractChildForm<ParentForm[ParentFieldName]> =
    HoneyFormExtractChildForm<ParentForm[ParentFieldName]>,
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

export const useChildHoneyFormContext = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext = undefined,
  ChildForm extends HoneyFormExtractChildForm<ParentForm[ParentFieldName]> =
    HoneyFormExtractChildForm<ParentForm[ParentFieldName]>,
>() => {
  const childFormContext = useContext<
    ChildHoneyFormContextValue<ParentForm, ParentFieldName, FormContext, ChildForm> | undefined
  >(ChildHoneyFormContext);

  assert(
    childFormContext,
    '[@react-hive/honey-form]: The `useChildHoneyFormContext()` can be used only inside <ChildHoneyFormProvider/> component!',
  );

  return childFormContext;
};
