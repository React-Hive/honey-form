import { useCallback, useEffect, useRef, useState } from 'react';
import { assert } from '@react-hive/honey-utils';

import { GITHUB_PACKAGE_NAME } from '../../constants';
import { localStorageCapabilities } from '../../init';
import { isFormSavedToLs, readFormValuesFromLs } from '../../helpers';
import type {
  HoneyFormBaseForm,
  HoneyFormFieldsConfig,
  HoneyFormRestoreUnsubmittedForm,
  HoneyFormStorage,
} from '../../types';

interface UseUnsubmittedFormOptions<Form extends HoneyFormBaseForm, FormContext> {
  fields: HoneyFormFieldsConfig<Form, FormContext>;
  formName?: string;
  storage?: HoneyFormStorage;
  readDefaultsFromStorage: boolean;
  onRestore: (defaults: Form) => void;
}

export const useUnsubmittedForm = <Form extends HoneyFormBaseForm, FormContext>({
  fields,
  formName,
  storage,
  readDefaultsFromStorage,
  onRestore,
}: UseUnsubmittedFormOptions<Form, FormContext>) => {
  const [hasUnsubmittedForm, setHasUnsubmittedForm] = useState(false);

  const isUnsubmittedFormRestored = useRef(false);

  const restoreUnsubmittedForm = useCallback<HoneyFormRestoreUnsubmittedForm>(() => {
    assert(hasUnsubmittedForm, `[${GITHUB_PACKAGE_NAME}]: Form not found in the local storage.`);
    assert(
      storage === 'ls',
      `[${GITHUB_PACKAGE_NAME}]: Restoring unsubmitted form is only supported for local storage.`,
    );
    assert(
      localStorageCapabilities.readable,
      `[${GITHUB_PACKAGE_NAME}]: Local storage is not available.`,
    );

    isUnsubmittedFormRestored.current = true;

    onRestore(readFormValuesFromLs(fields, formName));
  }, []);

  useEffect(() => {
    if (readDefaultsFromStorage) {
      // Do not allow restoring an unsubmitted form when it's automatically restored from storage
      return;
    }

    if (formName && storage) {
      if (storage === 'ls') {
        if (isFormSavedToLs(formName)) {
          setHasUnsubmittedForm(true);
        }
      }
    }
  }, []);

  return {
    hasUnsubmittedForm,
    restoreUnsubmittedForm,
  };
};
