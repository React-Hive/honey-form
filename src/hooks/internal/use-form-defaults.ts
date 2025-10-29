import { useEffect, useRef, useState } from 'react';
import { isFunction } from '@react-hive/honey-utils';

import { deserializeFormFromQueryString, error } from '../../helpers';
import type {
  Nullable,
  HoneyFormBaseForm,
  HoneyFormDefaults,
  HoneyFormDefaultValues,
  HoneyFormFieldsConfig,
  HoneyFormStorage,
} from '../../types';

interface UseFormDefaultsOptions<Form extends HoneyFormBaseForm, FormContext> {
  formContext: FormContext;
  fields: HoneyFormFieldsConfig<Form, FormContext>;
  defaults: HoneyFormDefaults<Form, FormContext>;
  formName?: string;
  storage?: HoneyFormStorage;
  readFromStorage: boolean;
  refetchOnContextChange: boolean;
  onFetchSucceed: (defaults: Partial<Form>) => void;
}

export const useFormDefaults = <Form extends HoneyFormBaseForm, FormContext = undefined>({
  formContext,
  fields,
  defaults,
  formName,
  storage,
  readFromStorage,
  refetchOnContextChange,
  onFetchSucceed,
}: UseFormDefaultsOptions<Form, FormContext>) => {
  const [isFormDefaultsFetching, setIsFormDefaultsFetching] = useState(false);
  const [isFormDefaultsFetchingErred, setIsFormDefaultsFetchingErred] = useState(false);

  const fetchIdRef = useRef(0);
  const prevContextRef = useRef<FormContext | undefined>(undefined);
  const fetchAbortControllerRef = useRef<Nullable<AbortController>>(null);

  const [formDefaults] = useState<HoneyFormDefaultValues<Form>>(() => {
    if (readFromStorage && formName) {
      if (storage === 'qs') {
        // Defaults from storage can extend/override the defaults which were set via property
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
    if (!isFunction(defaults)) {
      return;
    }

    const prevContext = prevContextRef.current;
    const isInitialMount = prevContext === undefined;
    const isContextChanged = prevContext !== formContext;

    prevContextRef.current = formContext;

    if (!isInitialMount && !refetchOnContextChange && isContextChanged) {
      return;
    }

    const currentFetchId = ++fetchIdRef.current;

    setIsFormDefaultsFetching(true);
    setIsFormDefaultsFetchingErred(false);

    const abortController = new AbortController();
    fetchAbortControllerRef.current = abortController;

    defaults({
      formContext,
      signal: abortController.signal,
    })
      .then(defaults => {
        if (currentFetchId === fetchIdRef.current) {
          // Returned defaults from the promise function can extend/override the form defaults
          formDefaultsRef.current = {
            ...formDefaultsRef.current,
            ...defaults,
          };

          onFetchSucceed(defaults);
        }
      })
      .catch(e => {
        if (e.name === 'AbortError') {
          return;
        }

        if (currentFetchId === fetchIdRef.current) {
          error('Unable to fetch or process the form default values.');

          setIsFormDefaultsFetchingErred(true);
        }
      })
      .finally(() => {
        if (currentFetchId === fetchIdRef.current) {
          setIsFormDefaultsFetching(false);
        }
      });

    return () => {
      abortController.abort();

      fetchAbortControllerRef.current = null;
    };
  }, [formContext]);

  return {
    formDefaultsRef,
    isFormDefaultsFetching,
    isFormDefaultsFetchingErred,
  };
};
