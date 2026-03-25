import { act, renderHook, waitFor } from '@testing-library/react';

import { useHoneyForm } from '../hooks';

describe('Skip form fields', () => {
  it('should skip field permanently', async () => {
    type Form = {
      name: string;
      price: number;
    };

    const onSubmit = jest.fn<Promise<void>, [Form]>();

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
          },
          price: {
            type: 'string',
            skip: () => true,
          },
        },
        onSubmit,
      }),
    );

    act(() => {
      result.current.formFields.name.setValue('Apple');
      result.current.formFields.price.setValue(10);
    });

    expect(result.current.formFields.name.displayValue).toBe('Apple');
    expect(result.current.formFields.price.displayValue).toBe(10);

    await act(() => result.current.submitForm());

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          name: 'Apple',
        },
        expect.any(Object),
      ),
    );
  });

  it('should skip form field by condition', async () => {
    type Form = {
      name: string;
      price: number;
    };

    const onSubmit = jest.fn<Promise<void>, [Form]>();

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
          },
          price: {
            type: 'number',
            skip: ({ formFields }) => formFields.name.displayValue === 'Pear',
          },
        },
        onSubmit,
      }),
    );

    act(() => {
      result.current.formFields.name.setValue('Orange');
      result.current.formFields.price.setValue(15);
    });

    await act(() => result.current.submitForm());

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          name: 'Orange',
          price: 15,
        },
        expect.any(Object),
      ),
    );

    act(() => result.current.formFields.name.setValue('Pear'));

    await act(() => result.current.submitForm());

    expect(result.current.formFields.price.displayValue).toBe(15);

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          name: 'Pear',
        },
        expect.any(Object),
      ),
    );
  });
});
