import { useEffect, useRef, useState } from 'react';
import { isFunction } from '@react-hive/honey-utils';

import { error, readFormFromStorage } from '../../helpers';
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
      if (storage) {
        // Defaults from storage can extend/override the defaults which were set via property
        return {
          ...defaults,
          ...readFormFromStorage(storage, fields, formName),
        };
      }
    }

    return isFunction(defaults) ? {} : { ...defaults };
  });

  const formDefaultsRef = useRef<HoneyFormDefaultValues<Form>>(formDefaults);
  /**
   * The defaults the form was given - the object, or what the function resolved to - without the
   * values read from storage over them.
   */
  const givenFormDefaultsRef = useRef<HoneyFormDefaultValues<Form>>(
    isFunction(defaults) ? {} : { ...defaults },
  );

  /**
   * Reads the stored values over the defaults the form was given again, as on creating the form -
   * for the values another history entry holds in the query string.
   */
  const rereadFormDefaultsFromStorage = () => {
    formDefaultsRef.current = {
      ...givenFormDefaultsRef.current,
      ...readFormFromStorage(storage, fields, formName),
    };
  };

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

          givenFormDefaultsRef.current = {
            ...givenFormDefaultsRef.current,
            ...defaults,
          };

          onFetchSucceed(defaults);
        }
      })
      .catch(e => {
        const err = e as Error;

        if (err.name === 'AbortError') {
          return;
        }

        if (currentFetchId === fetchIdRef.current) {
          error('Unable to fetch or process the form default values', formName);

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
    rereadFormDefaultsFromStorage,
    isFormDefaultsFetching,
    isFormDefaultsFetchingErred,
  };
};
