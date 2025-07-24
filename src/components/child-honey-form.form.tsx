import React from 'react';
import { invokeIfFunction } from '@react-hive/honey-utils';
import type { HTMLAttributes, ReactNode } from 'react';

import type {
  HoneyFormBaseForm,
  HoneyFormApi,
  KeysWithArrayValues,
  HoneyFormExtractChildForm,
} from '../types';

import { useChildHoneyFormContext } from './child-honey-form.provider';
import { useHoneyFormContext } from './honey-form.provider';

export type ChildHoneyFormFormContent<
  // TODO: pass ParentForm to ChildHoneyFormApi
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext = undefined,
  ChildForm extends HoneyFormExtractChildForm<
    ParentForm[ParentFieldName]
  > = HoneyFormExtractChildForm<ParentForm[ParentFieldName]>,
> =
  | ReactNode
  | ((
      childHoneyFormApi: HoneyFormApi<ChildForm, FormContext>,
      parentHoneyFormApi: HoneyFormApi<ParentForm, FormContext>,
    ) => ReactNode);

export interface ChildHoneyFormFormProps<
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext = undefined,
> extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  children?: ChildHoneyFormFormContent<ParentForm, ParentFieldName, FormContext>;
}

export const ChildHoneyFormForm = <
  ParentForm extends HoneyFormBaseForm,
  ParentFieldName extends KeysWithArrayValues<ParentForm>,
  FormContext = undefined,
>({
  children,
  ...props
}: ChildHoneyFormFormProps<ParentForm, ParentFieldName, FormContext>) => {
  const parentHoneyFormApi = useHoneyFormContext<ParentForm, FormContext>();
  const childHoneyFormApi = useChildHoneyFormContext<ParentForm, ParentFieldName, FormContext>();

  return (
    <div role="form" data-testid="child-honey-form" {...props}>
      {invokeIfFunction(children, childHoneyFormApi, parentHoneyFormApi)}
    </div>
  );
};
