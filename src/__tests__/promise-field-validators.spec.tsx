import { act, renderHook, waitFor } from '@testing-library/react';

import { defer } from '../tests.helpers';
import { useHoneyForm } from '../hooks';

describe('Promise field validators', () => {
  it('should handle promise-based validator function (resolve)', async () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            validator: value =>
              defer(() => (value === 'Apple' ? 'Apples are not accepted!' : true)),
          },
        },
      }),
    );

    expect(result.current.formFields.name.errors).toStrictEqual([]);

    act(() => result.current.formFields.name.setValue('Apple'));

    await waitFor(() =>
      expect(result.current.formFields.name.errors).toStrictEqual([
        {
          type: 'invalid',
          message: 'Apples are not accepted!',
        },
      ]),
    );

    act(() => result.current.formFields.name.setValue('Pear'));

    expect(result.current.formFields.name.errors).toStrictEqual([]);
  });

  it('should handle promise-based validator function (reject)', async () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            validator: () =>
              new Promise((resolve, reject) => {
                setTimeout(() => {
                  reject(new Error('Something went wrong!'));
                }, 0);
              }),
          },
        },
      }),
    );

    expect(result.current.formFields.name.errors).toStrictEqual([]);

    act(() => result.current.formFields.name.setValue('Beans'));

    await waitFor(() =>
      expect(result.current.formFields.name.errors).toStrictEqual([
        {
          type: 'invalid',
          message: 'Something went wrong!',
        },
      ]),
    );
  });

  it('should handle promise-based validator function and abort correctly', async () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            validator: (value, { signal }) => defer(() => (signal.aborted ? 'Aborted' : true)),
          },
        },
      }),
    );

    expect(result.current.formFields.name.errors).toStrictEqual([]);

    act(() => result.current.formFields.name.setValue('Apple'));
    act(() => result.current.formFields.name.setValue('Apple'));

    await waitFor(() =>
      expect(result.current.formFields.name.errors).toStrictEqual([
        {
          type: 'invalid',
          message: 'Aborted',
        },
      ]),
    );

    act(() => result.current.formFields.name.setValue('Apple'));

    await waitFor(() => expect(result.current.formFields.name.errors).toStrictEqual([]));
  });

  it('should abort promise-based validator function when form is reset', async () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            validator: (value, { signal }) => defer(() => (signal.aborted ? 'Aborted' : true)),
          },
        },
      }),
    );

    expect(result.current.formFields.name.errors).toStrictEqual([]);

    act(() => result.current.formFields.name.setValue('Apple'));
    act(() => result.current.resetForm());

    await waitFor(() =>
      expect(result.current.formFields.name.errors).toStrictEqual([
        {
          type: 'invalid',
          message: 'Aborted',
        },
      ]),
    );
  });

  it('should execute promise-based validator functions when submitting', async () => {
    const onSubmit = jest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            validator: value =>
              defer(() => (value === 'Apple' ? 'Apples are not accepted!' : true)),
          },
        },
        onSubmit,
      }),
    );

    expect(result.current.formFields.name.errors).toStrictEqual([]);

    act(() => result.current.formFields.name.setValue('Apple'));

    await act(() => result.current.submitForm());

    expect(result.current.formFields.name.errors).toStrictEqual([
      {
        type: 'invalid',
        message: 'Apples are not accepted!',
      },
    ]);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should handle asynchronous field validation state and update form submission status', async () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            validator: () => defer(() => null),
          },
        },
      }),
    );

    act(() => result.current.formFields.name.setValue('Apple'));

    await waitFor(() => {
      expect(result.current.formFields.name.isValidating).toBeTruthy();
      expect(result.current.formFields.name.props['aria-busy']).toBeTruthy();

      expect(result.current.isAnyFormFieldValidating).toBeTruthy();
      // The form submission should not be allowed when any field is in the validation process
      expect(result.current.isFormSubmitAllowed).toBeFalsy();
    });

    await waitFor(() => {
      expect(result.current.formFields.name.isValidating).toBeFalsy();
      expect(result.current.formFields.name.props['aria-busy']).toBeFalsy();

      expect(result.current.isAnyFormFieldValidating).toBeFalsy();
      expect(result.current.isFormSubmitAllowed).toBeTruthy();
    });
  });
});
