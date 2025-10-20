import { useEffect, useRef, useState } from 'react';
import { isFunction } from '@react-hive/honey-utils';

import { deserializeFormFromQueryString, error } from '../../helpers';
import type {
  HoneyFormBaseForm,
  HoneyFormDefaults,
  HoneyFormDefaultValues,
  HoneyFormFieldsConfig,
  HoneyFormStorage,
} from '../../types';

interface UseFormDefaultsOptions<Form extends HoneyFormBaseForm, FormContext> {
  formName?: string;
  fields: HoneyFormFieldsConfig<Form, FormContext>;
  defaults: HoneyFormDefaults<Form>;
  readDefaultsFromStorage: boolean;
  storage?: HoneyFormStorage;
  onFetchSucceed: (values: Partial<Form>) => void;
}

export const useFormDefaults = <Form extends HoneyFormBaseForm, FormContext = undefined>({
  formName,
  fields,
  defaults,
  readDefaultsFromStorage,
  storage,
  onFetchSucceed,
}: UseFormDefaultsOptions<Form, FormContext>) => {
  const [isFormDefaultsFetching, setIsFormDefaultsFetching] = useState(false);
  const [isFormDefaultsFetchingErred, setIsFormDefaultsFetchingErred] = useState(false);

  const [formDefaults] = useState<HoneyFormDefaultValues<Form>>(() => {
    if (readDefaultsFromStorage && formName) {
      if (storage === 'qs') {
        // Defaults from storage can extend/override the defaults set via property
        return {
          ...defaults,
          ...deserializeFormFromQueryString(fields, formName),
        };
      }
    }

    return isFunction(defaults) ? {} : { ...defaults };
  });

  const formDefaultsRef = useRef<HoneyFormDefaultValues<Form>>(formDefaults);

  useEffect(() => {
    if (isFunction(defaults)) {
      setIsFormDefaultsFetching(true);

      defaults()
        .then(defaultValues => {
          // Returned defaults from the promise function can extend/override the form defaults
          formDefaultsRef.current = {
            ...formDefaultsRef.current,
            ...defaultValues,
          };

          onFetchSucceed(defaultValues);
        })
        .catch(() => {
          error('Unable to fetch or process the form default values.');

          setIsFormDefaultsFetchingErred(true);
        })
        .finally(() => setIsFormDefaultsFetching(false));
    }
  }, []);

  return {
    formDefaultsRef,
    isFormDefaultsFetching,
    isFormDefaultsFetchingErred,
  };
};
