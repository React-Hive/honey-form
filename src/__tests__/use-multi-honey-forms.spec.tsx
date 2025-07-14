import { act, renderHook } from '@testing-library/react';

import { useMultiHoneyForms, useHoneyForm } from '../hooks';

describe('Hook [use-multi-honey-forms]: General', () => {
  it('should add/remove a form to/from multi forms list', () => {
    const { result: multiFormsApi } = renderHook(() => useMultiHoneyForms({}));

    const { result: formApi } = renderHook(() => useHoneyForm({}));

    // Add a new form
    act(() => {
      multiFormsApi.current.addForm(formApi.current);
    });

    expect(multiFormsApi.current.forms).toStrictEqual([formApi.current]);

    // Remove the added form
    act(() => multiFormsApi.current.removeForm(formApi.current));

    expect(multiFormsApi.current.forms).toStrictEqual([]);
  });

  it('should insert form to multi forms list', () => {
    const { result: multiFormsApi } = renderHook(() => useMultiHoneyForms({}));

    const { result: formApi1 } = renderHook(() => useHoneyForm({}));
    const { result: formApi2 } = renderHook(() => useHoneyForm({}));

    act(() => multiFormsApi.current.insertForm(0, formApi1.current));

    expect(multiFormsApi.current.forms).toStrictEqual([formApi1.current]);

    act(() => multiFormsApi.current.insertForm(0, formApi2.current));

    expect(multiFormsApi.current.forms).toStrictEqual([formApi2.current, formApi1.current]);
  });

  it('should replace form in multi forms list', () => {
    const { result: multiFormsApi } = renderHook(() => useMultiHoneyForms({}));

    const { result: formApi1 } = renderHook(() => useHoneyForm({}));
    const { result: formApi2 } = renderHook(() => useHoneyForm({}));

    act(() => {
      multiFormsApi.current.addForm(formApi1.current);
    });

    expect(multiFormsApi.current.forms).toStrictEqual([formApi1.current]);

    act(() => multiFormsApi.current.replaceForm(formApi1.current, formApi2.current));

    expect(multiFormsApi.current.forms).toStrictEqual([formApi2.current]);
  });

  it('should clear all added multi forms from list', () => {
    const { result: multiFormsApi } = renderHook(() => useMultiHoneyForms({}));

    const { result: formApi } = renderHook(() => useHoneyForm({}));

    act(() => {
      multiFormsApi.current.addForm(formApi.current);
    });

    expect(multiFormsApi.current.forms).toStrictEqual([formApi.current]);

    act(() => multiFormsApi.current.clearForms());

    expect(multiFormsApi.current.forms).toStrictEqual([]);
  });

  it('should reset multi forms', () => {
    type Form = {
      name: string;
    };

    const { result: multiFormsApi } = renderHook(() => useMultiHoneyForms<Form>({}));

    const { result: formApi } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
          },
        },
      }),
    );

    // Add a new form
    act(() => {
      multiFormsApi.current.addForm(formApi.current);
    });
    // Set a value for the name field
    act(() => formApi.current.formFields.name.setValue('Orange'));

    expect(formApi.current.formValues.name).toBe('Orange');
    expect(multiFormsApi.current.forms[0].formFields.name.value).toBe('Orange');
    expect(multiFormsApi.current.forms[0].formValues.name).toBe('Orange');

    act(() => multiFormsApi.current.resetForms());

    expect(multiFormsApi.current.forms[0].formValues.name).toBeUndefined();
  });

  it('should validate multi forms', async () => {
    type Form = {
      name: string;
    };

    const { result: multiFormsApi } = renderHook(() => useMultiHoneyForms<Form>({}));

    const { result: formApi } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            required: true,
            type: 'string',
          },
        },
      }),
    );

    act(() => {
      multiFormsApi.current.addForm(formApi.current);
    });

    await act(() => multiFormsApi.current.validateForms());

    expect(multiFormsApi.current.forms).toHaveLength(1);
    expect(multiFormsApi.current.forms[0].formErrors).toStrictEqual({
      name: [
        {
          type: 'required',
          message: 'The value is required',
        },
      ],
    });

    act(() => formApi.current.formFields.name.setValue('Banana'));

    await act(() => multiFormsApi.current.validateForms());

    expect(multiFormsApi.current.forms[0].formErrors).toStrictEqual({});
  });

  it('should call `onSubmit` callback function with form values when all forms are submitted', async () => {
    type Form = {
      name: string;
    };

    const onSubmit = jest.fn<Promise<void>, [Form[]]>();

    const { result: multiFormsApi } = renderHook(() => useMultiHoneyForms<Form>({ onSubmit }));

    const { result: formApi } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
          },
        },
      }),
    );

    // Add a form
    act(() => {
      multiFormsApi.current.addForm(formApi.current);
    });

    // Set a value for the name field
    act(() => formApi.current.formFields.name.setValue('Apple'));

    // Submit all forms
    await act(() => multiFormsApi.current.submitForms());

    expect(onSubmit).toHaveBeenCalledWith(
      [
        {
          name: 'Apple',
        },
      ],
      { context: undefined },
    );
  });

  it('should update a form field value even if the form component was unmounted', async () => {
    type Form = {
      name: string;
    };

    const onSubmit = jest.fn<Promise<void>, [Form[]]>();

    const { result: multiFormsApi } = renderHook(() => useMultiHoneyForms<Form>({ onSubmit }));

    const { result: formApi, unmount } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
          },
        },
      }),
    );

    act(() => {
      multiFormsApi.current.addForm(formApi.current);
    });

    unmount();

    act(() => formApi.current.formFields.name.setValue('Apple'));

    await act(() => multiFormsApi.current.submitForms());

    expect(onSubmit).toHaveBeenCalledWith(
      [
        {
          name: 'Apple',
        },
      ],
      { context: undefined },
    );
  });
});
