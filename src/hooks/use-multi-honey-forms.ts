import { useCallback, useState } from 'react';

import type {
  HoneyFormApi,
  HoneyFormBaseForm,
  HoneyFormSubmitHandler,
  MultiHoneyFormOptions,
  MultiHoneyFormsApi,
} from '../types';

export const useMultiHoneyForms = <Form extends HoneyFormBaseForm, FormContext = undefined>({
  context: formContext,
  onSubmit,
}: MultiHoneyFormOptions<Form, FormContext>): MultiHoneyFormsApi<Form, FormContext> => {
  const [forms, setForms] = useState<HoneyFormApi<Form, FormContext>[]>([]);

  const [isAnyFormSubmitting, setIsAnyFormSubmitting] = useState(false);

  const removeForm = useCallback<MultiHoneyFormsApi<Form, FormContext>['removeForm']>(
    targetForm => {
      setForms(forms => forms.filter(form => form !== targetForm));
    },
    [],
  );

  const addForm = useCallback<MultiHoneyFormsApi<Form, FormContext>['addForm']>(
    form => {
      setForms(forms => [...forms, form]);

      return () => removeForm(form);
    },
    [removeForm],
  );

  const insertForm = useCallback<MultiHoneyFormsApi<Form, FormContext>['insertForm']>(
    (index, form) => {
      setForms(forms => {
        const nextForms = [...forms];

        nextForms.splice(index, 0, form);

        return nextForms;
      });
    },
    [],
  );

  const replaceForm = useCallback<MultiHoneyFormsApi<Form, FormContext>['replaceForm']>(
    (targetForm, newForm) => {
      setForms(forms => forms.map(form => (form === targetForm ? newForm : form)));
    },
    [],
  );

  const clearForms = useCallback<MultiHoneyFormsApi<Form, FormContext>['clearForms']>(() => {
    setForms([]);
  }, []);

  const validateForms = useCallback<MultiHoneyFormsApi<Form, FormContext>['validateForms']>(
    async () => Promise.all(forms.map(form => form.validateForm())),
    [forms],
  );

  const submitForms = useCallback<
    MultiHoneyFormsApi<Form, FormContext>['submitForms']
  >(async () => {
    try {
      setIsAnyFormSubmitting(true);

      const formsData: Form[] = [];

      const submitHandler =
        (formIndex: number): HoneyFormSubmitHandler<Form, FormContext> =>
        async data => {
          formsData.splice(formIndex, 0, data);

          return Promise.resolve();
        };

      const submitResult = await Promise.all(
        forms.map((form, formIndex) => form.submitForm(submitHandler(formIndex))),
      );

      // Call `onSubmit` callback function only when all forms were successfully passed the validation
      if (formsData.length === forms.length) {
        await onSubmit?.(formsData, { formContext });
      }

      return submitResult;
    } finally {
      setIsAnyFormSubmitting(false);
    }
  }, [forms]);

  const resetForms = useCallback<MultiHoneyFormsApi<Form, FormContext>['resetForms']>(
    () => forms.forEach(form => form.resetForm()),
    [forms],
  );

  return {
    forms,
    isAnyFormSubmitting,
    addForm,
    insertForm,
    replaceForm,
    removeForm,
    clearForms,
    validateForms,
    submitForms,
    resetForms,
  };
};
